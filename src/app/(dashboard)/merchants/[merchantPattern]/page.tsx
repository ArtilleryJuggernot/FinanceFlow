"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function MerchantDetailPage() {
  const params = useParams<{ merchantPattern: string }>();
  const merchantRef = decodeURIComponent(params.merchantPattern);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-detail", merchantRef],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantRef)}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {data?.profile?.displayName || data?.merchantPattern || merchantRef}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{data?.merchantPattern || merchantRef}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats?.transactionCount || 0}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total dépensé</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(data?.stats?.totalSpent || 0)}</p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Panier moyen</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(data?.stats?.averageAmount || 0)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Evolution mensuelle</h2>
        <div className="space-y-2">
          {(data?.trend || []).map((item: { month: string; amount: number }) => (
            <div key={item.month} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{item.month}</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Transactions récentes</h2>
        <div className="space-y-2">
          {(data?.transactions || []).map(
            (tx: { id: string; date: string; description: string; amount: number; category: { name: string } | null }) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateShort(tx.date)} - {tx.category?.name || "Non catégorisé"}
                  </p>
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(Math.abs(tx.amount))}</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
