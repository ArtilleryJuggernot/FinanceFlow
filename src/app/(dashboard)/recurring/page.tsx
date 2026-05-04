"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useRef, useState } from "react";
import { Loader2, Repeat, RefreshCw, ChevronDown, X } from "lucide-react";
import { cn, formatCurrency, formatDateShort } from "@/lib/utils";
import { CategoryBadge } from "@/components/transactions/CategoryBadge";

type RecurringGroup = {
  id: string;
  merchantName: string;
  estimatedAmount: number;
  frequency: string;
  isActive: boolean;
  category: { id: string; name: string; color: string } | null;
  merchantRule: {
    excludeFromRecurring: boolean;
    wishlistRecurring?: boolean;
    categoryIds: string[];
    displayName?: string | null;
    avatarUrl?: string | null;
    notes?: string | null;
  } | null;
};

type CategoryItem = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  children?: { id: string; name: string; color?: string | null; icon?: string | null }[];
};

type MerchantTx = {
  id: string;
  date: string;
  amount: number;
  description: string;
  account: { name: string };
  category: { name: string } | null;
};

type MerchantRule = {
  id: string;
  merchantPattern: string;
  excludeFromRecurring: boolean;
  wishlistRecurring?: boolean;
  categoryIds: string[] | null;
};

function normalizeRecurringAvatarUrl(url?: string | null): string {
  if (!url) return "";
  const cleaned = url.trim().replace(/\\/g, "/");
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned;
  if (cleaned.startsWith("/api/uploads/merchant-avatar/file/")) return cleaned;
  if (cleaned.startsWith("/uploads/merchants/")) {
    const filename = cleaned.split("/").pop();
    return filename ? `/api/uploads/merchant-avatar/file/${filename}` : cleaned;
  }
  if (cleaned.startsWith("uploads/merchants/")) {
    const filename = cleaned.split("/").pop();
    return filename ? `/api/uploads/merchant-avatar/file/${filename}` : `/${cleaned}`;
  }
  if (cleaned.startsWith("/")) return cleaned;
  return `/${cleaned}`;
}

export default function RecurringPage() {
  const queryClient = useQueryClient();
  const [autoDetectTriggered, setAutoDetectTriggered] = useState(false);

  const { data: groups, isLoading } = useQuery({
    queryKey: ["recurring"],
    queryFn: async () => {
      const res = await fetch("/api/recurring");
      return res.json();
    },
  });
  const [openMerchant, setOpenMerchant] = useState<string | null>(null);
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState<string | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });
  const { data: merchantRules } = useQuery({
    queryKey: ["recurring-rules"],
    queryFn: async () => {
      const res = await fetch("/api/recurring/rules");
      return res.json();
    },
  });

  const { data: merchantTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["recurring-merchant-transactions", openMerchant],
    enabled: !!openMerchant,
    queryFn: async () => {
      const res = await fetch(
        `/api/recurring/transactions?merchantName=${encodeURIComponent(openMerchant || "")}`
      );
      return res.json();
    },
  });

  const detect = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recurring/detect", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });

  const updateMerchantRule = useMutation({
    mutationFn: async (payload: {
      merchantName: string;
      excludeFromRecurring?: boolean;
      categoryIds?: string[];
      displayName?: string;
      notes?: string;
      avatarUrl?: string;
      wishlistRecurring?: boolean;
    }) => {
      const res = await fetch("/api/recurring/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
    },
  });

  useEffect(() => {
    if (isLoading || autoDetectTriggered || detect.isPending) return;
    if (groups && Array.isArray(groups) && groups.length === 0) {
      setAutoDetectTriggered(true);
      detect.mutate();
    }
  }, [isLoading, groups, autoDetectTriggered, detect]);

  useEffect(() => {
    if (!openCategoryDropdown) return;
    const onMouseDown = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setOpenCategoryDropdown(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openCategoryDropdown]);

  const freqLabel: Record<string, string> = {
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    quarterly: "Trimestriel",
    yearly: "Annuel",
  };
  const allCategories: { id: string; name: string; color?: string | null; icon?: string | null }[] = (categories || []).flatMap(
    (parent: CategoryItem) => [parent, ...(parent.children || [])]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const activeGroups: RecurringGroup[] = groups?.filter((g: RecurringGroup) => g.isActive) || [];
  const excludedMerchants: MerchantRule[] =
    (merchantRules || []).filter((rule: MerchantRule) => rule.excludeFromRecurring) || [];
  const totalMonthly = activeGroups.reduce(
    (sum: number, g: { estimatedAmount: number; frequency: string }) => {
      if (g.frequency === "weekly") return sum + g.estimatedAmount * 4.33;
      if (g.frequency === "quarterly") return sum + g.estimatedAmount / 3;
      if (g.frequency === "yearly") return sum + g.estimatedAmount / 12;
      return sum + g.estimatedAmount;
    },
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dépenses récurrentes
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Vos abonnements et paiements réguliers
          </p>
        </div>
        <button
          onClick={() => detect.mutate()}
          disabled={detect.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {detect.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Détecter
        </button>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <p className="text-sm opacity-80">Total mensuel estimé</p>
        <p className="text-3xl font-bold mt-1">
          {formatCurrency(totalMonthly)}
        </p>
        <p className="text-sm opacity-80 mt-1">
          {activeGroups.length} abonnement{activeGroups.length > 1 ? "s" : ""}{" "}
          actif{activeGroups.length > 1 ? "s" : ""}
        </p>
      </div>

      {activeGroups.length === 0 ? (
        <div className="text-center py-20">
          <Repeat className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun abonnement détecté
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Importez des transactions puis lancez la détection
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Marchand
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Catégorie
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Fréquence
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Montant
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Catégorie
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeGroups.map((g) => (
                <Fragment key={g.id}>
                  <tr
                    key={g.id}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-gray-750",
                      g.merchantRule?.wishlistRecurring &&
                        "bg-amber-50/70 dark:bg-amber-950/25"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {g.merchantRule?.avatarUrl ? (
                          <div className="h-9 w-16 shrink-0 overflow-hidden rounded-md bg-gray-50 p-0.5 dark:bg-gray-800">
                            <img
                              src={normalizeRecurringAvatarUrl(g.merchantRule.avatarUrl)}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-9 w-16 shrink-0 rounded-md bg-gray-100 dark:bg-gray-700" />
                        )}
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMerchant((prev) =>
                                prev === g.merchantName ? null : g.merchantName
                              )
                            }
                            className="flex w-full items-center gap-2 text-left font-medium text-gray-900 dark:text-white"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 transition-transform",
                                openMerchant === g.merchantName && "rotate-180"
                              )}
                            />
                            <span className="truncate">
                              {g.merchantRule?.wishlistRecurring && (
                                <span className="mr-1 text-amber-600 dark:text-amber-400" title="Wishlist">
                                  📌
                                </span>
                              )}
                              {g.merchantRule?.displayName || g.merchantName}
                            </span>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {g.category ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: g.category.color + "20",
                            color: g.category.color,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.category.color }} />
                          {g.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                      {freqLabel[g.frequency] || g.frequency}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600">
                      -{formatCurrency(g.estimatedAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="relative"
                        ref={openCategoryDropdown === g.id ? categoryDropdownRef : undefined}
                      >
                        <button
                          onClick={() =>
                            setOpenCategoryDropdown((prev) => (prev === g.id ? null : g.id))
                          }
                          className="group flex items-center gap-1 cursor-pointer"
                        >
                          <CategoryBadge
                            name={g.category?.name}
                            color={g.category?.color}
                            icon={null}
                          />
                          <ChevronDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        {openCategoryDropdown === g.id && (
                          <div className="absolute top-full left-0 z-50 mt-1 w-64 max-h-72 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                            <div className="p-2">
                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                Choisir une catégorie
                              </div>
                              {allCategories.map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    updateMerchantRule.mutate({
                                      merchantName: g.merchantName,
                                      categoryIds: [cat.id],
                                    });
                                    setOpenCategoryDropdown(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                                    g.category?.id === cat.id && "bg-gray-100 dark:bg-gray-800"
                                  )}
                                >
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: cat.color || "#9ca3af" }}
                                  />
                                  {cat.icon && <span className="text-xs">{cat.icon}</span>}
                                  <span className="text-gray-700 dark:text-gray-300 truncate">
                                    {cat.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateMerchantRule.mutate({
                              merchantName: g.merchantName,
                              wishlistRecurring: !g.merchantRule?.wishlistRecurring,
                            })
                          }
                          title={
                            g.merchantRule?.wishlistRecurring
                              ? "Retirer de la wishlist"
                              : "Wishlist : épingler en haut de la liste"
                          }
                          className={cn(
                            "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-1 text-base leading-none transition-colors",
                            g.merchantRule?.wishlistRecurring
                              ? "border-emerald-400 bg-emerald-100 text-emerald-900 shadow-sm dark:border-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-100"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750"
                          )}
                        >
                          ✅
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateMerchantRule.mutate({
                              merchantName: g.merchantName,
                              excludeFromRecurring: true,
                            })
                          }
                          title="Exclure ce marchand des abonnements (banlist)"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {openMerchant === g.merchantName && (
                    <tr key={`${g.id}-details`}>
                      <td colSpan={6} className="bg-gray-50/80 dark:bg-gray-900/60 px-6 py-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                          Historique récent
                        </p>
                        {isLoadingTransactions ? (
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        ) : !merchantTransactions?.length ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Aucune transaction trouvée
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              defaultValue={g.merchantRule?.notes || ""}
                              onBlur={(e) =>
                                updateMerchantRule.mutate({
                                  merchantName: g.merchantName,
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Notes sur ce marchand..."
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-300"
                            />
                            {merchantTransactions.map((tx: MerchantTx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                              >
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {tx.description}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDateShort(tx.date)} - {tx.account.name} -{" "}
                                    {tx.category?.name || "Non catégorisé"}
                                  </p>
                                </div>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {formatCurrency(Math.abs(tx.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Marchands exclus (banlist)
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ces marchands ne sont pas pris en compte dans la détection des abonnements.
        </p>
        {excludedMerchants.length === 0 ? (
          <p className="text-sm text-gray-400 mt-4">Aucun marchand exclu.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {excludedMerchants.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {rule.merchantPattern}
                </span>
                <button
                  onClick={() =>
                    updateMerchantRule.mutate({
                      merchantName: rule.merchantPattern,
                      excludeFromRecurring: false,
                    })
                  }
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Réactiver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
