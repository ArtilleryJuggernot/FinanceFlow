import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface BalanceCardProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
}

export default function BalanceCard({
  totalBalance,
  monthlyIncome,
  monthlyExpenses,
  savingsRate,
}: BalanceCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-transparent dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-transparent" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Solde total
          </p>
        </div>

        <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {formatCurrency(totalBalance)}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Revenus
              </span>
            </div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(monthlyIncome)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Dépenses
              </span>
            </div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(monthlyExpenses)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Épargne
              </span>
            </div>
            <p
              className={cn(
                "text-sm font-semibold",
                savingsRate >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {savingsRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
