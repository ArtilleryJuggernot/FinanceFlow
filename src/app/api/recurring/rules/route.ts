import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { normalizeMerchantName } from "@/lib/merchant";

const updateRuleSchema = z.object({
  merchantName: z.string().min(1),
  excludeFromRecurring: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  displayName: z.string().optional(),
  notes: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const rules = await prisma.merchantRule.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Recurring rules list error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = updateRuleSchema.parse(await request.json());
    const merchantPattern = normalizeMerchantName(payload.merchantName);
    const recurringGroups = await prisma.recurringGroup.findMany({
      where: { userId: session.user.id },
      select: { id: true, merchantName: true },
    });
    const matchingRecurringGroupIds = recurringGroups
      .filter((group) => normalizeMerchantName(group.merchantName) === merchantPattern)
      .map((group) => group.id);

    const rule = await prisma.merchantRule.upsert({
      where: {
        userId_merchantPattern: {
          userId: session.user.id,
          merchantPattern,
        },
      },
      update: {
        ...(payload.excludeFromRecurring !== undefined && {
          excludeFromRecurring: payload.excludeFromRecurring,
        }),
        ...(payload.categoryIds !== undefined && { categoryIds: payload.categoryIds }),
        ...(payload.displayName !== undefined && { displayName: payload.displayName }),
        ...(payload.notes !== undefined && { notes: payload.notes }),
        ...(payload.avatarUrl !== undefined && { avatarUrl: payload.avatarUrl }),
      },
      create: {
        userId: session.user.id,
        merchantPattern,
        excludeFromRecurring: payload.excludeFromRecurring ?? false,
        categoryIds: payload.categoryIds ?? [],
        displayName: payload.displayName,
        notes: payload.notes,
        avatarUrl: payload.avatarUrl,
      },
    });

    if (payload.excludeFromRecurring === true) {
      if (matchingRecurringGroupIds.length > 0) {
        await prisma.recurringGroup.updateMany({
          where: { id: { in: matchingRecurringGroupIds } },
          data: { isActive: false },
        });
      }
    } else if (payload.excludeFromRecurring === false) {
      if (matchingRecurringGroupIds.length > 0) {
        await prisma.recurringGroup.updateMany({
          where: { id: { in: matchingRecurringGroupIds } },
          data: { isActive: true },
        });
      }
    }

    if (payload.categoryIds !== undefined) {
      const primaryCategoryId = payload.categoryIds[0] ?? null;

      if (primaryCategoryId) {
        const existingCategoryRule = await prisma.categoryRule.findFirst({
          where: {
            userId: session.user.id,
            pattern: merchantPattern,
          },
        });
        if (existingCategoryRule) {
          await prisma.categoryRule.update({
            where: { id: existingCategoryRule.id },
            data: { categoryId: primaryCategoryId, priority: 100 },
          });
        } else {
          await prisma.categoryRule.create({
            data: {
              userId: session.user.id,
              pattern: merchantPattern,
              categoryId: primaryCategoryId,
              priority: 100,
            },
          });
        }
      }

      const candidateTransactions = await prisma.transaction.findMany({
        where: {
          account: { userId: session.user.id },
          merchantName: { not: null },
        },
        select: {
          id: true,
          merchantName: true,
        },
      });

      const matchingIds = candidateTransactions
        .filter(
          (tx) => tx.merchantName && normalizeMerchantName(tx.merchantName) === merchantPattern
        )
        .map((tx) => tx.id);

      if (matchingIds.length > 0) {
        await prisma.transaction.updateMany({
          where: { id: { in: matchingIds } },
          data: { categoryId: primaryCategoryId },
        });
      }

      if (matchingRecurringGroupIds.length > 0) {
        await prisma.recurringGroup.updateMany({
          where: { id: { in: matchingRecurringGroupIds } },
          data: { categoryId: primaryCategoryId },
        });
      }
    }

    return NextResponse.json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Recurring rules error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
