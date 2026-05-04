"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Store, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function MerchantsPage() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [uploadingMerchant, setUploadingMerchant] = useState<string | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    if (search.trim()) p.set("search", search.trim());
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [dateFrom, dateTo, search, page, limit]);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-analytics", dateFrom, dateTo, search, page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/merchants?${params}`);
      return res.json();
    },
  });
  const updateMerchant = useMutation({
    mutationFn: async (payload: {
      merchantName: string;
      displayName?: string;
      avatarUrl?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/recurring/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
  const uploadMerchantAvatar = useMutation({
    mutationFn: async ({ merchantName, file }: { merchantName: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/uploads/merchant-avatar", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Erreur upload");

      const patchRes = await fetch("/api/recurring/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName,
          avatarUrl: uploadData.url,
        }),
      });
      if (!patchRes.ok) {
        const patchData = await patchRes.json();
        throw new Error(patchData.error || "Erreur assignation avatar");
      }

      return uploadData;
    },
    onSuccess: () => {
      setUploadingMerchant(null);
      queryClient.invalidateQueries({ queryKey: ["merchant-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: () => {
      setUploadingMerchant(null);
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
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Recherche
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Nom ou catégorie dominante..."
              className="h-9 min-w-[240px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Nombre de marchands
            </label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Profil marchand
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.merchants.map(
                  (merchant: {
                    merchantName: string;
                    merchantPattern: string;
                    displayName: string;
                    avatarUrl?: string | null;
                    notes?: string | null;
                    topCategory: string;
                    transactionCount: number;
                    averageAmount: number;
                    totalSpent: number;
                  }) => (
                    <tr
                      key={merchant.merchantPattern}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {merchant.avatarUrl ? (
                            <img
                              src={merchant.avatarUrl}
                              alt={merchant.displayName}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900" />
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/merchants/${encodeURIComponent(merchant.merchantPattern)}`}
                              className="font-medium text-gray-900 dark:text-white hover:text-indigo-600"
                            >
                              {merchant.displayName}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {merchant.merchantName}
                            </p>
                          </div>
                        </div>
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
                      <td className="px-4 py-3">
                        <input
                          defaultValue={merchant.displayName}
                          onBlur={(e) =>
                            updateMerchant.mutate({
                              merchantName: merchant.merchantName,
                              displayName: e.target.value,
                            })
                          }
                          className="h-8 w-32 rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-xs"
                          placeholder="Alias"
                        />
                        <input
                          defaultValue={merchant.avatarUrl || ""}
                          onBlur={(e) =>
                            updateMerchant.mutate({
                              merchantName: merchant.merchantName,
                              avatarUrl: e.target.value,
                            })
                          }
                          className="mt-1 h-8 w-40 rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-xs"
                          placeholder="URL image"
                        />
                        <label className="mt-1 inline-flex h-8 cursor-pointer items-center rounded border border-gray-200 dark:border-gray-700 px-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                          {uploadingMerchant === merchant.merchantPattern
                            ? "Upload..."
                            : "Uploader image"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingMerchant(merchant.merchantPattern);
                              uploadMerchantAvatar.mutate({
                                merchantName: merchant.merchantName,
                                file,
                              });
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <input
                          defaultValue={merchant.notes || ""}
                          onBlur={(e) =>
                            updateMerchant.mutate({
                              merchantName: merchant.merchantName,
                              notes: e.target.value,
                            })
                          }
                          className="mt-1 h-8 w-40 rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-xs"
                          placeholder="Note"
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          {data?.pagination?.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {data.pagination.total} marchand{data.pagination.total > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.pagination.page <= 1}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    data.pagination.page <= 1
                      ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-sm text-gray-600 dark:text-gray-300">
                  {data.pagination.page} / {data.pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                  }
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    data.pagination.page >= data.pagination.totalPages
                      ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
