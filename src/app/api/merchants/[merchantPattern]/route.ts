import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeMerchantName } from "@/lib/merchant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ merchantPattern: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { merchantPattern } = await params;
    const decoded = decodeURIComponent(merchantPattern);
    const rule = await prisma.merchantRule.findFirst({
      where: { userId: session.user.id, merchantPattern: decoded },
    });

    const txs = await prisma.transaction.findMany({
      where: {
        account: { userId: session.user.id },
        merchantName: { not: null },
      },
      select: {
        id: true,
        date: true,
        amount: true,
        description: true,
        merchantName: true,
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    const transactions = txs.filter(
      (tx) => tx.merchantName && normalizeMerchantName(tx.merchantName) === decoded
    );
    const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgAmount = transactions.length ? totalSpent / transactions.length : 0;

    const trendMap = new Map<string, number>();
    for (const tx of transactions) {
      const month = tx.date.toISOString().slice(0, 7);
      trendMap.set(month, (trendMap.get(month) || 0) + Math.abs(tx.amount));
    }

    return NextResponse.json({
      merchantPattern: decoded,
      profile: rule || null,
      stats: {
        transactionCount: transactions.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageAmount: Math.round(avgAmount * 100) / 100,
      },
      trend: Array.from(trendMap.entries()).map(([month, amount]) => ({
        month,
        amount: Math.round(amount * 100) / 100,
      })),
      transactions: transactions.slice(0, 50),
    });
  } catch (error) {
    console.error("Merchant detail error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
