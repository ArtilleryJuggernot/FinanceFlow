import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const where: Record<string, unknown> = {
      account: { userId: session.user.id },
      amount: { lt: 0 },
      merchantName: { not: null },
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        merchantName: true,
        category: { select: { name: true } },
      },
    });

    const grouped = new Map<
      string,
      {
        merchantName: string;
        totalSpent: number;
        transactionCount: number;
        averageAmount: number;
        topCategory: string;
      }
    >();

    for (const tx of transactions) {
      if (!tx.merchantName) continue;
      const key = tx.merchantName.trim();
      if (!grouped.has(key)) {
        grouped.set(key, {
          merchantName: key,
          totalSpent: 0,
          transactionCount: 0,
          averageAmount: 0,
          topCategory: "Non catégorisé",
        });
      }

      const item = grouped.get(key)!;
      item.totalSpent += Math.abs(tx.amount);
      item.transactionCount += 1;
      item.averageAmount = item.totalSpent / item.transactionCount;

      if (tx.category?.name) {
        item.topCategory = tx.category.name;
      }
    }

    const merchants = Array.from(grouped.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit)
      .map((m) => ({
        ...m,
        totalSpent: Math.round(m.totalSpent * 100) / 100,
        averageAmount: Math.round(m.averageAmount * 100) / 100,
      }));

    const totalSpent = merchants.reduce((sum, m) => sum + m.totalSpent, 0);

    return NextResponse.json({
      merchants,
      summary: {
        merchantCount: grouped.size,
        totalSpent: Math.round(totalSpent * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Merchants analytics error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
