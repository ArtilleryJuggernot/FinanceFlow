"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { Loader2, Repeat, RefreshCw, ChevronDown, X } from "lucide-react";
import { cn, formatCurrency, formatDateShort } from "@/lib/utils";

type RecurringGroup = {
  id: string;
  merchantName: string;
  estimatedAmount: number;
  frequency: string;
  isActive: boolean;
  category: { id: string; name: string; color: string } | null;
  merchantRule: { excludeFromRecurring: boolean; categoryIds: string[] } | null;
};

type CategoryItem = {
  id: string;
  name: string;
  children?: { id: string; name: string }[];
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
  categoryIds: string[] | null;
};

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
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({});

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

  const freqLabel: Record<string, string> = {
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    quarterly: "Trimestriel",
    yearly: "Annuel",
  };
  const allCategories: { id: string; name: string }[] = (categories || []).flatMap(
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
          {activeGroups.length} abonnement{activeGroups.length > 1 ? "s" : ""} actif
          {activeGroups.length > 1 ? "s" : ""}
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
                  Catégories associées
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeGroups.map((g) => (
                <Fragment key={g.id}>
                  <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          setOpenMerchant((prev) => (prev === g.merchantName ? null : g.merchantName))
                        }
                        className="flex items-center gap-2 font-medium text-gray-900 dark:text-white"
                      >
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            openMerchant === g.merchantName && "rotate-180"
                          )}
                        />
                        {g.merchantName}
                      </button>
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
                      <select
                        multiple
                        value={selectedCategories[g.id] || (g.merchantRule?.categoryIds || [])}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                          setSelectedCategories((prev) => ({ ...prev, [g.id]: values }));
                        }}
                        className="min-w-[220px] h-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          updateMerchantRule.mutate({
                            merchantName: g.merchantName,
                            categoryIds: selectedCategories[g.id] || g.merchantRule?.categoryIds || [],
                          })
                        }
                        className="mt-2 inline-flex items-center rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                      >
                        Enregistrer
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          updateMerchantRule.mutate({
                            merchantName: g.merchantName,
                            excludeFromRecurring: true,
                          })
                        }
                        title="Exclure ce marchand des abonnements"
                        className="inline-flex items-center justify-center rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
