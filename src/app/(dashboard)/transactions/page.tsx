"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFiltersBar as TransactionFilters } from "@/components/transactions/TransactionFilters";
import { ImportDialog } from "@/components/transactions/ImportDialog";
import { Loader2, Upload, Sparkles, Download } from "lucide-react";

type Filters = {
  search?: string;
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
};

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({});
  const [importOpen, setImportOpen] = useState(false);

  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", "30");
  if (filters.search) params.set("search", filters.search);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.type) params.set("type", filters.type);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, filters],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?${params}`);
      return res.json();
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
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

  const updateCategory = useMutation({
    mutationFn: async ({ txId, categoryId }: { txId: string; categoryId: string }) => {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: txId, categoryId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const categorizeAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/transactions/categorize", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const handleFilter = (f: Filters) => {
    setFilters(f);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transactions
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {data?.pagination?.total || 0} transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => categorizeAll.mutate()}
            disabled={categorizeAll.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {categorizeAll.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Catégoriser auto
          </button>
          <a
            href={`/api/export?format=csv&${params}`}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </a>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importer
          </button>
        </div>
      </div>

      <TransactionFilters
        accounts={accounts || []}
        categories={categories || []}
        onFilter={handleFilter}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <TransactionTable
          transactions={data?.transactions || []}
          categories={categories || []}
          onUpdateCategory={(txId, categoryId) =>
            updateCategory.mutate({ txId, categoryId })
          }
          pagination={{
            page: data?.pagination?.page || 1,
            totalPages: data?.pagination?.totalPages || 1,
            total: data?.pagination?.total || 0,
          }}
          onPageChange={setPage}
        />
      )}

      <ImportDialog
        accounts={accounts || []}
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }}
      />
    </div>
  );
}
