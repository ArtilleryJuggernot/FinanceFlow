"use client";

import { useQuery } from "@tanstack/react-query";
import BalanceCard from "@/components/dashboard/BalanceCard";
import CategoryPieChart from "@/components/dashboard/CategoryPieChart";
import MonthlyTrend from "@/components/dashboard/MonthlyTrend";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import SpendingChart from "@/components/dashboard/SpendingChart";
import { Loader2, RefreshCw } from "lucide-react";

async function fetchDashboard() {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const stats = data || {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsRate: 0,
    topCategories: [],
    monthlyTrend: [],
    recentTransactions: [],
    budgetAlerts: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Vue d&apos;ensemble de vos finances
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <BalanceCard
        totalBalance={stats.totalBalance}
        monthlyIncome={stats.monthlyIncome}
        monthlyExpenses={stats.monthlyExpenses}
        savingsRate={stats.savingsRate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPieChart data={stats.topCategories} />
        <SpendingChart budgets={stats.budgetAlerts} />
      </div>

      <MonthlyTrend data={stats.monthlyTrend} />

      <RecentTransactions transactions={stats.recentTransactions} />
    </div>
  );
}
