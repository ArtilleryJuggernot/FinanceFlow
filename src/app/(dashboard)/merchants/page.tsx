"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Store,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Settings2,
  StickyNote,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

type SortDirection = "asc" | "desc" | "normal";
type SortKey = "displayName" | "topCategory" | "transactionCount" | "averageAmount" | "totalSpent";

type MerchantItem = {
  merchantId: string | null;
  merchantName: string;
  merchantPattern: string;
  displayName: string;
  avatarUrl?: string | null;
  notes?: string | null;
  topCategory: string;
  transactionCount: number;
  averageAmount: number;
  totalSpent: number;
};

function normalizeDisplayImageUrl(url?: string | null): string {
  if (!url) return "";
  const cleaned = url.trim().replace(/\\/g, "/");
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned;
  if (cleaned.startsWith("/")) return cleaned;
  return `/${cleaned}`;
}

export default function MerchantsPage() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [uploadingMerchant, setUploadingMerchant] = useState<string | null>(null);
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"table" | "quality">("table");
  const [sortKey, setSortKey] = useState<SortKey>("totalSpent");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingMerchant, setEditingMerchant] = useState<MerchantItem | null>(null);
  const [avatarSearch, setAvatarSearch] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    displayName: "",
    avatarUrl: "",
    notes: "",
  });

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    if (search.trim()) p.set("search", search.trim());
    if (categoryFilter) p.set("category", categoryFilter);
    if (sortDirection !== "normal") {
      p.set("sortBy", sortKey);
      p.set("sortDir", sortDirection);
    }
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [dateFrom, dateTo, search, categoryFilter, sortKey, sortDirection, page, limit]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "merchant-analytics",
      dateFrom,
      dateTo,
      search,
      categoryFilter,
      sortKey,
      sortDirection,
      page,
      limit,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/merchants?${params}`);
      return res.json();
    },
  });
  const updateMerchant = useMutation({
    mutationFn: async (payload: {
      merchantName: string;
      merchantId?: string;
      merchantPattern?: string;
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
      setEditingMerchant(null);
    },
  });
  const uploadMerchantAvatar = useMutation({
    mutationFn: async ({
      merchantName,
      merchantId,
      merchantPattern,
      file,
    }: {
      merchantName: string;
      merchantId: string;
      merchantPattern: string;
      file: File;
    }) => {
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
          merchantId,
          merchantPattern,
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
  const { data: avatarLibrary } = useQuery({
    queryKey: ["merchant-avatar-library", avatarSearch, editingMerchant?.merchantPattern],
    enabled: !!editingMerchant,
    queryFn: async () => {
      const p = new URLSearchParams({
        search: avatarSearch.trim(),
        limit: "20",
      });
      const res = await fetch(`/api/uploads/merchant-avatar?${p.toString()}`);
      return res.json();
    },
  });

  const merchants: MerchantItem[] = data?.merchants || [];
  const categories = Array.from(new Set(merchants.map((m) => m.topCategory))).sort((a, b) =>
    a.localeCompare(b)
  );
  const qualityRows = merchants.filter(
    (m) =>
      m.topCategory === "Non catégorisé" ||
      !m.avatarUrl ||
      !m.notes ||
      !m.displayName ||
      m.displayName.trim().toLowerCase() === m.merchantName.trim().toLowerCase()
  );

  const rowStart = ((data?.pagination?.page || 1) - 1) * (data?.pagination?.limit || limit);

  function cycleSort(nextKey: SortKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey);
      setSortDirection("asc");
      setPage(1);
      return;
    }
    setSortDirection((prev) => {
      const next = prev === "normal" ? "asc" : prev === "asc" ? "desc" : "normal";
      return next;
    });
    setPage(1);
  }

  function sortIconFor(key: SortKey) {
    if (sortKey !== key || sortDirection === "normal") return <ArrowUpDown className="h-3.5 w-3.5" />;
    if (sortDirection === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
    return <ArrowDown className="h-3.5 w-3.5" />;
  }

  function openProfileModal(merchant: MerchantItem) {
    setEditingMerchant(merchant);
    setAvatarSearch("");
    setProfileDraft({
      displayName: merchant.displayName || "",
      avatarUrl: merchant.avatarUrl || "",
      notes: merchant.notes || "",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dépenses par marchand
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Classement et gestion avancée des marchands</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
          <button
            onClick={() => setActiveTab("table")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              activeTab === "table"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            Tableau marchands
          </button>
          <button
            onClick={() => setActiveTab("quality")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              activeTab === "quality"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            Contrôle qualité
          </button>
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
              Filtre catégorie
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
      ) : !merchants.length ? (
        <div className="text-center py-20">
          <Store className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucune dépense marchand trouvée sur cette période.
          </p>
        </div>
      ) : activeTab === "quality" ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Marchand</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Problèmes détectés</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {qualityRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    Aucun problème détecté. Les profils marchands sont complets.
                  </td>
                </tr>
              ) : (
                qualityRows.map((merchant) => {
                  const issues: string[] = [];
                  if (merchant.topCategory === "Non catégorisé") issues.push("Catégorie manquante");
                  if (!merchant.avatarUrl) issues.push("Photo manquante");
                  if (!merchant.notes) issues.push("Note manquante");
                  if (
                    !merchant.displayName ||
                    merchant.displayName.trim().toLowerCase() === merchant.merchantName.trim().toLowerCase()
                  ) {
                    issues.push("Alias non personnalisé");
                  }

                  return (
                    <tr key={merchant.merchantPattern} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{merchant.displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{merchant.merchantName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {issues.map((issue) => (
                            <span
                              key={issue}
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openProfileModal(merchant)}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Corriger
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => cycleSort("displayName")}
                      className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Marchand
                      {sortIconFor("displayName")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => cycleSort("topCategory")}
                      className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Catégorie dominante
                      {sortIconFor("topCategory")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => cycleSort("transactionCount")}
                      className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Transactions
                      {sortIconFor("transactionCount")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => cycleSort("averageAmount")}
                      className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Panier moyen
                      {sortIconFor("averageAmount")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => cycleSort("totalSpent")}
                      className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Dépenses totales
                      {sortIconFor("totalSpent")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant, idx) => (
                    <tr
                      key={merchant.merchantPattern}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {rowStart + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {merchant.avatarUrl && !brokenAvatars[merchant.merchantPattern] ? (
                            <div className="h-8 w-14 overflow-hidden rounded-md bg-gray-50 p-0.5 dark:bg-gray-800">
                              <img
                                src={normalizeDisplayImageUrl(merchant.avatarUrl)}
                                alt={merchant.displayName}
                                className="h-full w-full object-contain"
                                onError={() =>
                                  setBrokenAvatars((prev) => ({
                                    ...prev,
                                    [merchant.merchantPattern]: true,
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-14 rounded-md bg-indigo-100 dark:bg-indigo-900" />
                          )}
                          <div className="min-w-0">
                            <Link
                              href={
                                merchant.merchantId
                                  ? `/merchants/${encodeURIComponent(merchant.merchantId)}`
                                  : "/merchants"
                              }
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openProfileModal(merchant)}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Profil
                          </button>
                          <button
                            onClick={() => openProfileModal(merchant)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                            Note
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {editingMerchant && (
        <div
          className="fixed inset-0 z-50 bg-black/40 p-4"
          onClick={() => setEditingMerchant(null)}
        >
          <div
            className="mx-auto mt-16 max-w-xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profil marchand
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {editingMerchant.merchantName}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Alias</label>
                <input
                  value={profileDraft.displayName}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  URL image
                </label>
                <input
                  value={profileDraft.avatarUrl}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, avatarUrl: e.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {uploadingMerchant === editingMerchant.merchantPattern
                    ? "Upload en cours..."
                    : "Uploader une image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingMerchant(editingMerchant.merchantPattern);
                      uploadMerchantAvatar.mutate(
                        {
                          merchantName: editingMerchant.merchantName,
                                  merchantId: editingMerchant.merchantId || editingMerchant.merchantPattern,
                                  merchantPattern: editingMerchant.merchantPattern,
                          file,
                        },
                        {
                          onSuccess: (uploadData: { url: string }) => {
                            setProfileDraft((prev) => ({ ...prev, avatarUrl: uploadData.url }));
                            updateMerchant.mutate({
                              merchantName: editingMerchant.merchantName,
                                      merchantId: editingMerchant.merchantId || undefined,
                                      merchantPattern: editingMerchant.merchantPattern,
                              avatarUrl: uploadData.url,
                            });
                          },
                        }
                      );
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {profileDraft.avatarUrl ? (
                  <div className="h-12 w-24 overflow-hidden rounded-md bg-gray-50 p-1 dark:bg-gray-800">
                    <img
                      src={normalizeDisplayImageUrl(profileDraft.avatarUrl)}
                      alt={profileDraft.displayName || editingMerchant.merchantName}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-24 rounded-md bg-gray-100 dark:bg-gray-800" />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                  Réutiliser une image existante
                </label>
                <input
                  value={avatarSearch}
                  onChange={(e) => setAvatarSearch(e.target.value)}
                  placeholder="Filtrer par nom de fichier upload..."
                  className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
                />
                <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  {(avatarLibrary || []).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      Aucune image trouvée.
                    </p>
                  ) : (
                    (avatarLibrary || []).map(
                      (item: { filename: string; url: string; updatedAt: string }) => (
                        <button
                          key={item.filename}
                          onClick={() =>
                            setProfileDraft((prev) => ({
                              ...prev,
                              avatarUrl: item.url,
                            }))
                          }
                          className="flex w-full items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="h-8 w-14 overflow-hidden rounded bg-gray-50 p-0.5 dark:bg-gray-800">
                            <img
                              src={item.url}
                              alt={item.filename}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs text-gray-700 dark:text-gray-200">
                              {item.filename}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {new Date(item.updatedAt).toLocaleString("fr-FR")}
                            </p>
                          </div>
                        </button>
                      )
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Note</label>
                <textarea
                  rows={4}
                  value={profileDraft.notes}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ajouter une note sur le marchand..."
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingMerchant(null)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  updateMerchant.mutate({
                    merchantName: editingMerchant.merchantName,
                    merchantId: editingMerchant.merchantId || undefined,
                    merchantPattern: editingMerchant.merchantPattern,
                    displayName: profileDraft.displayName,
                    avatarUrl: profileDraft.avatarUrl,
                    notes: profileDraft.notes,
                  })
                }
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
