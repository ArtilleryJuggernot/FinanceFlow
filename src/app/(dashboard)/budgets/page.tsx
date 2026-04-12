"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { formatCurrency, getPercentage, getBudgetStatus } from "@/lib/utils";

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("monthly");

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const res = await fetch("/api/budgets");
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

  const createBudget = useMutation({
    mutationFn: async (data: { categoryId: string; amount: number; period: string }) => {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setShowForm(false);
      setCategoryId("");
      setAmount("");
    },
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const allCategories = categories
    ? categories.flatMap((c: { id: string; name: string; children?: { id: string; name: string }[] }) => [
        c,
        ...(c.children || []),
      ])
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;
    createBudget.mutate({
      categoryId,
      amount: parseFloat(amount),
      period,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Budgets
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Définissez des limites de dépenses par catégorie
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau budget
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Catégorie
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Sélectionner...</option>
                {allCategories.map((cat: { id: string; name: string }) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Montant limite
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="500"
                min="1"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Période
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="monthly">Mensuel</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createBudget.isPending}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {budgets?.length === 0 ? (
        <div className="text-center py-20">
          <Wallet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun budget défini
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Créez votre premier budget pour suivre vos dépenses
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets?.map(
            (budget: {
              id: string;
              amount: number;
              spent: number;
              period: string;
              category: { id: string; name: string; icon: string; color: string };
            }) => {
              const pct = getPercentage(budget.spent, budget.amount);
              const status = getBudgetStatus(budget.spent, budget.amount);

              return (
                <div
                  key={budget.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: budget.category.color + "20" }}
                      >
                        <span style={{ color: budget.category.color }} className="text-lg">
                          ●
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {budget.category.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {budget.period === "monthly" ? "Mensuel" : "Hebdomadaire"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBudget.mutate(budget.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(budget.spent)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      / {formatCurrency(budget.amount)}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor:
                          status === "safe"
                            ? "#22c55e"
                            : status === "warning"
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                  </div>

                  <p
                    className={`text-sm font-medium ${
                      status === "safe"
                        ? "text-green-600"
                        : status === "warning"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {pct}% utilisé
                    {status === "danger" && " — Budget dépassé !"}
                  </p>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
