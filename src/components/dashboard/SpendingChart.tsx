"use client";

import { cn, formatCurrency } from "@/lib/utils";

interface BudgetItem {
  id: string;
  category: {
    name: string;
    icon: string;
    color: string;
  };
  amount: number;
  spent: number;
}

interface SpendingChartProps {
  budgets: BudgetItem[];
}

function getStatusColor(spent: number, budget: number) {
  const ratio = budget > 0 ? (spent / budget) * 100 : 0;
  if (ratio >= 100) return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  if (ratio >= 80) return { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
}

export default function SpendingChart({ budgets }: SpendingChartProps) {
  const top5 = budgets
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        État des budgets
      </h3>

      {top5.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucun budget défini
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {top5.map((item) => {
            const percentage = item.amount > 0
              ? Math.round((item.spent / item.amount) * 100)
              : 0;
            const clampedWidth = Math.min(percentage, 100);
            const status = getStatusColor(item.spent, item.amount);

            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                      style={{
                        backgroundColor: `${item.category.color}18`,
                        color: item.category.color,
                      }}
                    >
                      {item.category.icon}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.category.name}
                    </span>
                  </div>
                  <span className={cn("text-xs font-semibold", status.text)}>
                    {percentage}%
                  </span>
                </div>

                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      status.bar
                    )}
                    style={{ width: `${clampedWidth}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatCurrency(item.spent)} dépensé</span>
                  <span>sur {formatCurrency(item.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
