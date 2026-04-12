import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, formatCurrency, formatDateShort } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string | Date;
  description: string;
  merchantName: string | null;
  amount: number;
  currency: string;
  category: {
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 5);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Transactions récentes
        </h3>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Tout voir
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucune transaction récente
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {recent.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{
                  backgroundColor: tx.category
                    ? `${tx.category.color}18`
                    : "#6b728014",
                  color: tx.category?.color ?? "#6b7280",
                }}
              >
                {tx.category?.icon ?? "💳"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {tx.description}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {tx.merchantName ?? tx.category?.name ?? "Non catégorisé"} ·{" "}
                  {formatDateShort(tx.date)}
                </p>
              </div>

              <p
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  tx.amount >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {tx.amount >= 0 ? "+" : ""}
                {formatCurrency(tx.amount, tx.currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
