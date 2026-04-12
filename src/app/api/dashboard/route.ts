import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { balance: true },
    });
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        account: { userId },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { amount: true },
    });

    const monthlyIncome = monthlyTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = Math.abs(
      monthlyTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    );

    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

    const categorySpending = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        account: { userId },
        amount: { lt: 0 },
        date: { gte: monthStart, lte: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "asc" } },
      take: 8,
    });

    const categoryIds = categorySpending
      .map((c) => c.categoryId)
      .filter((id): id is string => id !== null);

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const totalSpending = categorySpending.reduce(
      (sum, c) => sum + Math.abs(c._sum.amount || 0),
      0
    );

    const topCategories = categorySpending.map((c) => {
      const cat = categories.find((cat) => cat.id === c.categoryId);
      const amount = Math.abs(c._sum.amount || 0);
      return {
        name: cat?.name || "Autre",
        color: cat?.color || "#94a3b8",
        amount,
        percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
      };
    });

    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);

      const txs = await prisma.transaction.findMany({
        where: {
          account: { userId },
          date: { gte: mStart, lte: mEnd },
        },
        select: { amount: true },
      });

      const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = Math.abs(txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));

      monthlyTrend.push({
        month: format(monthDate, "MMM yy", { locale: fr }),
        income: Math.round(income),
        expenses: Math.round(expenses),
      });
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: { account: { userId } },
      include: {
        category: true,
        account: { select: { id: true, name: true, currency: true } },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true },
    });

    const budgetAlerts = await Promise.all(
      budgets.map(async (budget) => {
        const result = await prisma.transaction.aggregate({
          where: {
            categoryId: budget.categoryId,
            account: { userId },
            amount: { lt: 0 },
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        });

        return {
          ...budget,
          spent: Math.abs(result._sum.amount || 0),
        };
      })
    );

    return NextResponse.json({
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      savingsRate: Math.round(savingsRate),
      topCategories,
      monthlyTrend,
      recentTransactions,
      budgetAlerts,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
