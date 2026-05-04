import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeMerchantName } from "@/lib/merchant";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const groups = await prisma.recurringGroup.findMany({
      where: { userId: session.user.id },
      include: { category: true },
      orderBy: { estimatedAmount: "desc" },
    });

    const rules = await prisma.merchantRule.findMany({
      where: { userId: session.user.id },
    });

    const enriched = groups.map((group) => {
      const matchedRule = rules.find(
        (rule) => normalizeMerchantName(group.merchantName) === rule.merchantPattern
      );
      return {
        ...group,
        merchantRule: matchedRule
          ? {
              excludeFromRecurring: matchedRule.excludeFromRecurring,
              wishlistRecurring: matchedRule.wishlistRecurring,
              categoryIds: matchedRule.categoryIds ?? [],
              displayName: matchedRule.displayName,
              avatarUrl: matchedRule.avatarUrl,
              notes: matchedRule.notes,
            }
          : null,
      };
    });

    enriched.sort((a, b) => {
      const wa = a.merchantRule?.wishlistRecurring ? 1 : 0;
      const wb = b.merchantRule?.wishlistRecurring ? 1 : 0;
      if (wb !== wa) return wb - wa;
      return b.estimatedAmount - a.estimatedAmount;
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Recurring groups error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
