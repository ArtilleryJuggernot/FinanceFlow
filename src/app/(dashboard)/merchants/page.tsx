"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Store } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function MerchantsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit, setLimit] = useState(20);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    p.set("limit", String(limit));
    return p.toString();
  }, [dateFrom, dateTo, limit]);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-analytics", dateFrom, dateTo, limit],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/merchants?${params}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dépenses par marchand
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Classement des marchands les plus dépensiers
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Du
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Au
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Nombre de marchands
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : !data?.merchants?.length ? (
        <div className="text-center py-20">
          <Store className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucune dépense marchand trouvée sur cette période.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-indigo-600 text-white p-5">
              <p className="text-sm opacity-85">Total dépensé (Top affiché)</p>
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(data.summary?.totalSpent || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">Marchands distincts</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {data.summary?.merchantCount || 0}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Marchand
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Catégorie dominante
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Transactions
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Panier moyen
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    Dépenses totales
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.merchants.map(
                  (merchant: {
                    merchantName: string;
                    topCategory: string;
                    transactionCount: number;
                    averageAmount: number;
                    totalSpent: number;
                  }) => (
                    <tr
                      key={merchant.merchantName}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {merchant.merchantName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {merchant.topCategory}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {merchant.transactionCount}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(merchant.averageAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(merchant.totalSpent)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
