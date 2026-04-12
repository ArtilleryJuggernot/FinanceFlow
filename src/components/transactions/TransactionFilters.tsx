"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

export interface TransactionFilters {
  search: string;
  accountId: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  type: "all" | "income" | "expense";
}

interface TransactionFiltersProps {
  accounts: Account[];
  categories: CategoryOption[];
  onFilter: (filters: TransactionFilters) => void;
}

const defaultFilters: TransactionFilters = {
  search: "",
  accountId: "",
  categoryId: "",
  dateFrom: "",
  dateTo: "",
  type: "all",
};

export function TransactionFiltersBar({
  accounts,
  categories,
  onFilter,
}: TransactionFiltersProps) {
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);

  function updateFilter<K extends keyof TransactionFilters>(
    key: K,
    value: TransactionFilters[K]
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleApply() {
    onFilter(filters);
  }

  function handleReset() {
    setFilters(defaultFilters);
    onFilter(defaultFilters);
  }

  const hasActiveFilters =
    filters.search ||
    filters.accountId ||
    filters.categoryId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.type !== "all";

  const selectClasses =
    "h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors appearance-none cursor-pointer";

  const inputClasses =
    "h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-colors";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une transaction..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className={cn(inputClasses, "pl-9 w-full")}
          />
        </div>

        <select
          value={filters.accountId}
          onChange={(e) => updateFilter("accountId", e.target.value)}
          className={selectClasses}
        >
          <option value="">Tous les comptes</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>

        <select
          value={filters.categoryId}
          onChange={(e) => updateFilter("categoryId", e.target.value)}
          className={selectClasses}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className={cn(inputClasses, "w-[140px]")}
            title="Date de début"
          />
          <span className="text-gray-400 text-sm">à</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            className={cn(inputClasses, "w-[140px]")}
            title="Date de fin"
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => updateFilter("type", e.target.value as TransactionFilters["type"])}
          className={selectClasses}
        >
          <option value="all">Tous les types</option>
          <option value="income">Revenus</option>
          <option value="expense">Dépenses</option>
        </select>

        <button
          onClick={handleApply}
          className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtrer
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
