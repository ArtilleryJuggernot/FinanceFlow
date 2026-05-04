import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeMerchantName } from "@/lib/merchant";

type PrismaWithMerchantRule = typeof prisma & {
  merchantRule: {
    findFirst: (...args: unknown[]) => Promise<{
      merchantPattern?: string | null;
      publicId?: string | null;
      [key: string]: unknown;
    } | null>;
  };
};

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
    const prismaClient = prisma as PrismaWithMerchantRule;
    const ruleById = await prismaClient.merchantRule.findFirst({
      where: { userId: session.user.id, publicId: decoded },
    });
    const effectivePattern = ruleById?.merchantPattern || decoded;
    const rule =
      ruleById ||
      (await prismaClient.merchantRule.findFirst({
        where: { userId: session.user.id, merchantPattern: effectivePattern },
      }));

    const txs = await (prisma.transaction as unknown as {
      findMany: (args: unknown) => Promise<
        Array<{
          id: string;
          date: Date;
          amount: number;
          description: string;
          merchantName: string | null;
          notes: string | null;
          photoUrl?: string | null;
          category: { name: string } | null;
        }>
      >;
    }).findMany({
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
        notes: true,
        photoUrl: true,
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    const transactions = txs.filter(
      (tx) => tx.merchantName && normalizeMerchantName(tx.merchantName) === effectivePattern
    );
    const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgAmount = transactions.length ? totalSpent / transactions.length : 0;

    const trendMap = new Map<string, number>();
    for (const tx of transactions) {
      const month = tx.date.toISOString().slice(0, 7);
      trendMap.set(month, (trendMap.get(month) || 0) + Math.abs(tx.amount));
    }

    return NextResponse.json({
      merchantPattern: effectivePattern,
      merchantId: rule?.publicId || null,
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
