"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", "30");
  if (filters.search) params.set("search", filters.search);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.type) params.set("type", filters.type);

  useEffect(() => {
    if (!exportOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setExportOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [exportOpen]);

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

  const baseExportParams = useMemo(() => {
    const exportParams = new URLSearchParams();
    exportParams.set("format", "csv");
    if (filters.search) exportParams.set("search", filters.search);
    if (filters.accountId) exportParams.set("accountId", filters.accountId);
    if (filters.categoryId) exportParams.set("categoryId", filters.categoryId);
    if (filters.type) exportParams.set("type", filters.type);
    return exportParams;
  }, [filters]);

  const exportByRangeHref = useMemo(() => {
    const exportParams = new URLSearchParams(baseExportParams);
    if (exportDateFrom) exportParams.set("dateFrom", exportDateFrom);
    if (exportDateTo) exportParams.set("dateTo", exportDateTo);
    return `/api/export?${exportParams.toString()}`;
  }, [baseExportParams, exportDateFrom, exportDateTo]);

  const exportFromStartHref = useMemo(() => {
    const exportParams = new URLSearchParams(baseExportParams);
    exportParams.set("fromStart", "true");
    return `/api/export?${exportParams.toString()}`;
  }, [baseExportParams]);

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
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-40 mt-2 w-[320px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-xl">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Exporter une période
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Choisis une plage de dates, ou exporte tout l'historique.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                      Du
                    </label>
                    <input
                      type="date"
                      value={exportDateFrom}
                      onChange={(e) => setExportDateFrom(e.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                      Au
                    </label>
                    <input
                      type="date"
                      value={exportDateTo}
                      onChange={(e) => setExportDateTo(e.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <a
                    href={exportByRangeHref}
                    className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                  >
                    <Download className="h-4 w-4" />
                    Exporter la période
                  </a>
                  <a
                    href={exportFromStartHref}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Exporter depuis le début
                  </a>
                </div>
              </div>
            )}
          </div>
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
