import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

function normalizeMerchantName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\b(v\d+|x\d+)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const updateRuleSchema = z.object({
  merchantName: z.string().min(1),
  excludeFromRecurring: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = updateRuleSchema.parse(await request.json());
    const merchantPattern = normalizeMerchantName(payload.merchantName);

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
      },
      create: {
        userId: session.user.id,
        merchantPattern,
        excludeFromRecurring: payload.excludeFromRecurring ?? false,
        categoryIds: payload.categoryIds ?? [],
      },
    });

    if (payload.excludeFromRecurring === true) {
      await prisma.recurringGroup.updateMany({
        where: { userId: session.user.id, merchantName: { contains: payload.merchantName } },
        data: { isActive: false },
      });
    }

    if (payload.categoryIds && payload.categoryIds.length > 0) {
      await prisma.recurringGroup.updateMany({
        where: { userId: session.user.id, merchantName: { contains: payload.merchantName } },
        data: { categoryId: payload.categoryIds[0] },
      });
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
