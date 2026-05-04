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
    const category = (searchParams.get("category") || "").trim().toLowerCase();
    const sortBy = (searchParams.get("sortBy") || "totalSpent").trim();
    const sortDir = (searchParams.get("sortDir") || "desc").trim().toLowerCase();
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
        categorySpend: Record<string, number>;
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
          categorySpend: {},
        });
      }

      const item = grouped.get(key)!;
      item.totalSpent += Math.abs(tx.amount);
      item.transactionCount += 1;
      item.averageAmount = item.totalSpent / item.transactionCount;
      const monthKey = tx.date.toISOString().slice(0, 7);
      item.trendByMonth[monthKey] = (item.trendByMonth[monthKey] || 0) + Math.abs(tx.amount);

      const categoryName = tx.category?.name || "Non catégorisé";
      item.categorySpend[categoryName] = (item.categorySpend[categoryName] || 0) + Math.abs(tx.amount);
    }

    // Ensure each discovered merchant has a persistent UUID profile.
    for (const pattern of grouped.keys()) {
      if (!rules.find((r) => r.merchantPattern === pattern)) {
        await prisma.merchantRule.upsert({
          where: {
            userId_merchantPattern: {
              userId: session.user.id,
              merchantPattern: pattern,
            },
          },
          update: {},
          create: {
            userId: session.user.id,
            merchantPattern: pattern,
          },
        });
      }
    }

    const persistedRules = await prisma.merchantRule.findMany({
      where: { userId: session.user.id },
    });

    const computedMerchants = Array.from(grouped.values()).map((m) => {
      const persisted = persistedRules.find((r) => r.merchantPattern === m.merchantPattern);
      const topEntry =
        Object.entries(m.categorySpend).sort((a, b) => b[1] - a[1])[0] || ["Non catégorisé", 0];
      return {
        ...m,
        merchantId: persisted?.publicId || null,
        displayName: persisted?.displayName || m.displayName,
        avatarUrl: persisted?.avatarUrl || m.avatarUrl,
        notes: persisted?.notes || m.notes,
        topCategory: topEntry[0],
      };
    });

    const filteredMerchants = search
      ? computedMerchants.filter((m) => {
          const haystack = `${m.displayName} ${m.merchantName} ${m.topCategory}`.toLowerCase();
          return haystack.includes(search);
        })
      : computedMerchants;

    const categoryFilteredMerchants = category
      ? filteredMerchants.filter((m) => m.topCategory.toLowerCase() === category)
      : filteredMerchants;

    const sortedMerchants = [...categoryFilteredMerchants].sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      if (sortBy === "displayName") {
        return a.displayName.localeCompare(b.displayName) * direction;
      }
      if (sortBy === "topCategory") {
        return a.topCategory.localeCompare(b.topCategory) * direction;
      }
      if (sortBy === "transactionCount") {
        return (a.transactionCount - b.transactionCount) * direction;
      }
      if (sortBy === "averageAmount") {
        return (a.averageAmount - b.averageAmount) * direction;
      }
      return (a.totalSpent - b.totalSpent) * direction;
    });

    const total = sortedMerchants.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;

    const merchants = sortedMerchants
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
