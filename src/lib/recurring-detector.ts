import prisma from "./prisma";
import { subMonths } from "date-fns";

type TransactionGroup = {
  merchantName: string;
  count: number;
  amounts: number[];
  dates: Date[];
};

function normalizeMerchantName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\b(v\d+|x\d+)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectFrequency(avgIntervalDays: number): string {
  if (avgIntervalDays <= 10) return "weekly";
  if (avgIntervalDays <= 45) return "monthly";
  if (avgIntervalDays <= 120) return "quarterly";
  return "yearly";
}

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
    const canonicalMerchant = normalizeMerchantName(tx.merchantName);
    if (!canonicalMerchant) continue;
    const key = canonicalMerchant;

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
    if (avgAmount < 1) continue;

    const amountVariance = group.amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount < 0.35
    );

    const maxAmount = Math.max(...group.amounts);
    const minAmount = Math.min(...group.amounts);
    const amountSpreadIsSmall = (maxAmount - minAmount) / avgAmount < 0.5;

    if (!amountVariance && !amountSpreadIsSmall) continue;

    const intervals: number[] = [];
    for (let i = 1; i < group.dates.length; i++) {
      const diff = group.dates[i].getTime() - group.dates[i - 1].getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24));
    }

    if (intervals.length === 0) continue;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    const frequency = detectFrequency(avgInterval);

    const isRegular = intervals.every(
      (i) => Math.abs(i - avgInterval) / avgInterval < 0.45
    );

    if (!isRegular && group.count < 3) continue;

    recurring.push({
      merchantName: group.merchantName,
      estimatedAmount: Math.round(avgAmount * 100) / 100,
      frequency,
      lastDate: group.dates[group.dates.length - 1],
    });
  }

  const existingGroups = await prisma.recurringGroup.findMany({
    where: { userId },
  });

  for (const item of recurring) {
    const normalizedItem = normalizeMerchantName(item.merchantName);
    const existing = existingGroups.find(
      (group) => normalizeMerchantName(group.merchantName) === normalizedItem
    );

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
          message: `${item.merchantName} - ${item.estimatedAmount.toFixed(2)}€/${
            item.frequency === "monthly"
              ? "mois"
              : item.frequency === "weekly"
                ? "semaine"
                : item.frequency === "quarterly"
                  ? "trimestre"
                  : "an"
          }`,
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
