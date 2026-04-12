"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";

type CategoryRule = {
  id: string;
  pattern: string;
  categoryId: string;
  priority: number;
  category: { name: string; color: string };
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [newPattern, setNewPattern] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");

  const { data: rules, isLoading } = useQuery({
    queryKey: ["categoryRules"],
    queryFn: async () => {
      const res = await fetch("/api/settings/rules");
      return res.json();
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  const createRule = useMutation({
    mutationFn: async (data: { pattern: string; categoryId: string }) => {
      const res = await fetch("/api/settings/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryRules"] });
      setNewPattern("");
      setNewCategoryId("");
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/settings/rules?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryRules"] });
    },
  });

  const allCategories = categories
    ? categories.flatMap((c: { id: string; name: string; children?: { id: string; name: string }[] }) => [
        c,
        ...(c.children || []),
      ])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Paramètres
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configurez vos préférences et règles de catégorisation
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profil
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Nom</label>
            <p className="font-medium text-gray-900 dark:text-white">
              {session?.user?.name}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
            <p className="font-medium text-gray-900 dark:text-white">
              {session?.user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Règles de catégorisation
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Définissez des mots-clés pour catégoriser automatiquement vos transactions.
          Quand une transaction contient le mot-clé, elle sera assignée à la catégorie choisie.
        </p>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Mot-clé (ex: carrefour)"
          />
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Catégorie...</option>
            {allCategories.map((cat: { id: string; name: string }) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (newPattern && newCategoryId) {
                createRule.mutate({ pattern: newPattern, categoryId: newCategoryId });
              }
            }}
            disabled={!newPattern || !newCategoryId || createRule.isPending}
            className="flex items-center gap-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>

        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        ) : rules?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Aucune règle définie. Les règles se créent aussi automatiquement quand vous catégorisez manuellement une transaction.
          </p>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {rules?.map((rule: CategoryRule) => (
              <div key={rule.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-900 dark:text-white">
                    {rule.pattern}
                  </code>
                  <span className="text-gray-400">→</span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: rule.category.color + "20",
                      color: rule.category.color,
                    }}
                  >
                    {rule.category.name}
                  </span>
                </div>
                <button
                  onClick={() => deleteRule.mutate(rule.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Connexions API
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">GoCardless</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connexion bancaire Open Banking
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              process.env.NEXT_PUBLIC_GOCARDLESS_CONFIGURED === "true"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              Configurer dans .env
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">OpenAI</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Catégorisation IA des transactions
              </p>
            </div>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              Configurer dans .env
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
