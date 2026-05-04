import prisma from "@/lib/prisma";
import { ACTION_DEFINITIONS } from "./action-definitions";

type ActionContext = {
  userId: string;
  params?: Record<string, unknown>;
};

type ActionHandler = (ctx: ActionContext) => Promise<unknown>;

type RegisteredAction = {
  key: string;
  description: string;
  handler: ActionHandler;
};

const actions: RegisteredAction[] = [
  {
    key: ACTION_DEFINITIONS[0].key,
    description: ACTION_DEFINITIONS[0].description,
    handler: async ({ userId }) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const txs = await prisma.transaction.findMany({
        where: {
          account: { userId },
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { amount: true },
      });

      const income = txs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const expenses = txs.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        period: `${monthStart.toISOString().slice(0, 10)} -> ${monthEnd.toISOString().slice(0, 10)}`,
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        net: Math.round((income - expenses) * 100) / 100,
      };
    },
  },
  {
    key: ACTION_DEFINITIONS[1].key,
    description: ACTION_DEFINITIONS[1].description,
    handler: async ({ userId }) => {
      const txs = await prisma.transaction.findMany({
        where: { account: { userId } },
        orderBy: { date: "desc" },
        take: 10,
        include: { category: { select: { name: true } } },
      });

      return txs.map((tx) => ({
        id: tx.id,
        date: tx.date.toISOString().slice(0, 10),
        description: tx.description,
        merchantName: tx.merchantName,
        amount: Math.round(tx.amount * 100) / 100,
        category: tx.category?.name || "Non catégorisé",
      }));
    },
  },
  {
    key: ACTION_DEFINITIONS[2].key,
    description: ACTION_DEFINITIONS[2].description,
    handler: async ({ userId }) => {
      const txs = await prisma.transaction.findMany({
        where: { account: { userId }, amount: { lt: 0 }, merchantName: { not: null } },
        select: { merchantName: true, amount: true },
      });

      const map = new Map<string, number>();
      for (const tx of txs) {
        if (!tx.merchantName) continue;
        map.set(tx.merchantName, (map.get(tx.merchantName) || 0) + Math.abs(tx.amount));
      }

      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([merchant, spent]) => ({ merchant, spent: Math.round(spent * 100) / 100 }));
    },
  },
];

export function getActionRegistry() {
  return actions;
}

export function getActionByKey(actionKey: string) {
  return actions.find((a) => a.key === actionKey);
}
