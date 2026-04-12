import prisma from "./prisma";
import { subMonths } from "date-fns";

type TransactionGroup = {
  merchantName: string;
  count: number;
  amounts: number[];
  dates: Date[];
};

export async function detectRecurringTransactions(userId: string) {
  const sixMonthsAgo = subMonths(new Date(), 6);

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      amount: { lt: 0 },
      merchantName: { not: null },
      date: { gte: sixMonthsAgo },
    },
    orderBy: { date: "asc" },
  });

  const groups: Record<string, TransactionGroup> = {};

  for (const tx of transactions) {
    if (!tx.merchantName) continue;
    const key = tx.merchantName.toLowerCase().trim();

    if (!groups[key]) {
      groups[key] = {
        merchantName: tx.merchantName,
        count: 0,
        amounts: [],
        dates: [],
      };
    }

    groups[key].count++;
    groups[key].amounts.push(Math.abs(tx.amount));
    groups[key].dates.push(new Date(tx.date));
  }

  const recurring: {
    merchantName: string;
    estimatedAmount: number;
    frequency: string;
    lastDate: Date;
  }[] = [];

  for (const group of Object.values(groups)) {
    if (group.count < 2) continue;

    const avgAmount = group.amounts.reduce((a, b) => a + b, 0) / group.amounts.length;
    const amountVariance = group.amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount < 0.15
    );

    if (!amountVariance) continue;

    const intervals: number[] = [];
    for (let i = 1; i < group.dates.length; i++) {
      const diff = group.dates[i].getTime() - group.dates[i - 1].getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24));
    }

    if (intervals.length === 0) continue;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    let frequency = "monthly";
    if (avgInterval < 10) frequency = "weekly";
    else if (avgInterval > 80) frequency = "quarterly";
    else if (avgInterval > 340) frequency = "yearly";

    const isRegular = intervals.every(
      (i) => Math.abs(i - avgInterval) / avgInterval < 0.3
    );

    if (!isRegular && group.count < 4) continue;

    recurring.push({
      merchantName: group.merchantName,
      estimatedAmount: Math.round(avgAmount * 100) / 100,
      frequency,
      lastDate: group.dates[group.dates.length - 1],
    });
  }

  for (const item of recurring) {
    const existing = await prisma.recurringGroup.findFirst({
      where: {
        userId,
        merchantName: { equals: item.merchantName },
      },
    });

    if (existing) {
      await prisma.recurringGroup.update({
        where: { id: existing.id },
        data: {
          estimatedAmount: item.estimatedAmount,
          frequency: item.frequency,
          lastDetectedAt: new Date(),
          isActive: true,
        },
      });
    } else {
      const newGroup = await prisma.recurringGroup.create({
        data: {
          userId,
          merchantName: item.merchantName,
          estimatedAmount: item.estimatedAmount,
          frequency: item.frequency,
          lastDetectedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          type: "recurring_detected",
          title: "Nouvel abonnement détecté",
          message: `${item.merchantName} - ${item.estimatedAmount.toFixed(2)}€/${item.frequency === "monthly" ? "mois" : item.frequency === "weekly" ? "semaine" : "trimestre"}`,
        },
      });

      await prisma.transaction.updateMany({
        where: {
          account: { userId },
          merchantName: item.merchantName,
        },
        data: {
          isRecurring: true,
          recurringGroupId: newGroup.id,
        },
      });
    }
  }

  return recurring;
}
