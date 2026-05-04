import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
      const matchedRule = rules.find((rule) =>
        group.merchantName.toLowerCase().includes(rule.merchantPattern.toLowerCase())
      );
      return {
        ...group,
        merchantRule: matchedRule
          ? {
              excludeFromRecurring: matchedRule.excludeFromRecurring,
              categoryIds: matchedRule.categoryIds ?? [],
            }
          : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Recurring groups error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
