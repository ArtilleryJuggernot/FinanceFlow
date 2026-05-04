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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
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

    const [transactions, rules] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: {
          amount: true,
          merchantName: true,
          category: { select: { name: true } },
          date: true,
        },
      }),
      prisma.merchantRule.findMany({
        where: { userId: session.user.id },
      }),
    ]);

    const grouped = new Map<
      string,
      {
        merchantName: string;
        merchantPattern: string;
        displayName: string;
        avatarUrl: string | null;
        notes: string | null;
        totalSpent: number;
        transactionCount: number;
        averageAmount: number;
        topCategory: string;
        trendByMonth: Record<string, number>;
      }
    >();

    for (const tx of transactions) {
      if (!tx.merchantName) continue;
      const key = normalizeMerchantName(tx.merchantName.trim());
      const rule = rules.find((r) => r.merchantPattern === key);
      if (!grouped.has(key)) {
        grouped.set(key, {
          merchantName: tx.merchantName.trim(),
          merchantPattern: key,
          displayName: rule?.displayName || tx.merchantName.trim(),
          avatarUrl: rule?.avatarUrl || null,
          notes: rule?.notes || null,
          totalSpent: 0,
          transactionCount: 0,
          averageAmount: 0,
          topCategory: "Non catégorisé",
          trendByMonth: {},
        });
      }

      const item = grouped.get(key)!;
      item.totalSpent += Math.abs(tx.amount);
      item.transactionCount += 1;
      item.averageAmount = item.totalSpent / item.transactionCount;
      const monthKey = tx.date.toISOString().slice(0, 7);
      item.trendByMonth[monthKey] = (item.trendByMonth[monthKey] || 0) + Math.abs(tx.amount);

      if (tx.category?.name) {
        item.topCategory = tx.category.name;
      }
    }

    const sortedMerchants = Array.from(grouped.values()).sort((a, b) => b.totalSpent - a.totalSpent);

    const filteredMerchants = search
      ? sortedMerchants.filter((m) => {
          const haystack = `${m.displayName} ${m.merchantName} ${m.topCategory}`.toLowerCase();
          return haystack.includes(search);
        })
      : sortedMerchants;

    const total = filteredMerchants.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;

    const merchants = filteredMerchants
      .slice(start, start + limit)
      .map((m) => ({
        ...m,
        totalSpent: Math.round(m.totalSpent * 100) / 100,
        averageAmount: Math.round(m.averageAmount * 100) / 100,
        trendByMonth: Object.entries(m.trendByMonth).map(([month, amount]) => ({
          month,
          amount: Math.round(amount * 100) / 100,
        })),
      }));

    const totalSpent = merchants.reduce((sum, m) => sum + m.totalSpent, 0);

    return NextResponse.json({
      merchants,
      summary: {
        merchantCount: total,
        totalSpent: Math.round(totalSpent * 100) / 100,
      },
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Merchants analytics error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
