"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Repeat, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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

  const detect = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recurring/detect", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const activeGroups = groups?.filter((g: { isActive: boolean }) => g.isActive) || [];
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeGroups.map(
                (g: {
                  id: string;
                  merchantName: string;
                  estimatedAmount: number;
                  frequency: string;
                  category: { name: string; color: string } | null;
                }) => (
                  <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {g.merchantName}
                      </span>
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
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
