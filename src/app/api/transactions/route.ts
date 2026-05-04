import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeMerchantName } from "@/lib/merchant";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {
      account: { userId: session.user.id },
    };

    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { merchantName: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }
    if (type === "income") where.amount = { gt: 0 };
    if (type === "expense") where.amount = { lt: 0 };

    const [transactions, total, rules] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          account: { select: { id: true, name: true, currency: true } },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
      prisma.merchantRule.findMany({
        where: { userId: session.user.id },
        select: { merchantPattern: true, displayName: true, avatarUrl: true, notes: true },
      }),
    ]);

    const mappedTransactions = transactions.map((tx) => {
      if (!tx.merchantName) return tx;
      const normalized = normalizeMerchantName(tx.merchantName);
      const profile = rules.find((r) => r.merchantPattern === normalized);
      return {
        ...tx,
        merchantProfile: profile
          ? {
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
              notes: profile.notes,
            }
          : null,
      };
    });

    return NextResponse.json({
      transactions: mappedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Transactions error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { id, categoryId, notes, photoUrl } = body;

    const transaction = await prisma.transaction.findFirst({
      where: { id, account: { userId: session.user.id } },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(notes !== undefined && { notes }),
        ...(photoUrl !== undefined && { photoUrl }),
      },
      include: { category: true },
    });

    if (categoryId && transaction.merchantName) {
      const existingRule = await prisma.categoryRule.findFirst({
        where: {
          userId: session.user.id,
          pattern: transaction.merchantName.toLowerCase(),
        },
      });

      if (!existingRule) {
        await prisma.categoryRule.create({
          data: {
            userId: session.user.id,
            pattern: transaction.merchantName.toLowerCase(),
            categoryId,
            priority: 10,
          },
        });
      } else {
        await prisma.categoryRule.update({
          where: { id: existingRule.id },
          data: { categoryId },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
