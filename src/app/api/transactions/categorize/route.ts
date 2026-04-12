import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { categorizeTransaction } from "@/lib/categorizer";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId;

    const where: Record<string, unknown> = {
      account: { userId: session.user.id },
      categoryId: null,
    };

    if (accountId) where.accountId = accountId;

    const uncategorized = await prisma.transaction.findMany({
      where,
      take: 100,
    });

    let categorized = 0;

    for (const tx of uncategorized) {
      const categoryId = await categorizeTransaction(
        session.user.id,
        tx.description,
        tx.merchantName,
        tx.amount
      );

      if (categoryId) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { categoryId },
        });
        categorized++;
      }
    }

    return NextResponse.json({ categorized, total: uncategorized.length });
  } catch (error) {
    console.error("Categorize error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la catégorisation" },
      { status: 500 }
    );
  }
}
