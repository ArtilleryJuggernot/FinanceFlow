import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

const budgetSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  period: z.enum(["monthly", "weekly"]).default("monthly"),
  alertThreshold: z.number().min(0).max(1).default(0.8),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: session.user.id },
      include: { category: true },
    });

    const now = new Date();
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const dateRange =
          budget.period === "monthly"
            ? { gte: startOfMonth(now), lte: endOfMonth(now) }
            : { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) };

        const result = await prisma.transaction.aggregate({
          where: {
            categoryId: budget.categoryId,
            account: { userId: session.user!.id },
            amount: { lt: 0 },
            date: dateRange,
          },
          _sum: { amount: true },
        });

        return {
          ...budget,
          spent: Math.abs(result._sum.amount || 0),
        };
      })
    );

    return NextResponse.json(budgetsWithSpent);
  } catch (error) {
    console.error("Budgets error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const data = budgetSchema.parse(body);

    const budget = await prisma.budget.create({
      data: { ...data, userId: session.user.id },
      include: { category: true },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create budget error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await prisma.budget.deleteMany({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete budget error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
