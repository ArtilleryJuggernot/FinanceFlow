"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Tag } from "lucide-react";
import { cn, formatCurrency, formatDateShort } from "@/lib/utils";
import { CategoryBadge } from "./CategoryBadge";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type?: string;
  children?: Category[];
}

interface Transaction {
  id: string;
  date: string | Date;
  description: string;
  merchantName?: string | null;
  merchantProfile?: { displayName?: string | null; avatarUrl?: string | null; notes?: string | null } | null;
  amount: number;
  currency: string;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  account: { name: string };
  notes?: string | null;
  photoUrl?: string | null;
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
}

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdateCategory: (transactionId: string, categoryId: string) => void;
  onUpdateNotes?: (transactionId: string, notes: string) => void;
  onUploadPhoto?: (transactionId: string, file: File) => void;
  onSetPhotoUrl?: (transactionId: string, photoUrl: string) => void;
  pagination: Pagination;
  onPageChange?: (page: number) => void;
}

export function TransactionTable({
  transactions,
  categories,
  onUpdateCategory,
  onUpdateNotes,
  onUploadPhoto,
  onSetPhotoUrl,
  pagination,
  onPageChange,
}: TransactionTableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleCategorySelect(transactionId: string, categoryId: string) {
    onUpdateCategory(transactionId, categoryId);
    setOpenDropdown(null);
  }

  const flatCategories = categories.flatMap((cat) =>
    cat.children && cat.children.length > 0
      ? [cat, ...cat.children]
      : [cat]
  );

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Date
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Catégorie
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Description
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Compte
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  Aucune transaction trouvée
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {formatDateShort(tx.date)}
                  </td>
                  <td className="px-4 py-3 relative">
                    <div className="relative" ref={openDropdown === tx.id ? dropdownRef : undefined}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === tx.id ? null : tx.id)}
                        className="group flex items-center gap-1 cursor-pointer"
                      >
                        <CategoryBadge
                          name={tx.category?.name}
                          color={tx.category?.color}
                          icon={tx.category?.icon}
                        />
                        <ChevronDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>

                      {openDropdown === tx.id && (
                        <div className="absolute top-full left-0 z-50 mt-1 w-64 max-h-72 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                          <div className="p-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Choisir une catégorie
                            </div>
                            {flatCategories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => handleCategorySelect(tx.id, cat.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                                  tx.category?.id === cat.id && "bg-gray-100 dark:bg-gray-800"
                                )}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cat.color || "#9ca3af" }}
                                />
                                {cat.icon && <span className="text-xs">{cat.icon}</span>}
                                <span className="text-gray-700 dark:text-gray-300 truncate">
                                  {cat.children ? (
                                    <span className="font-medium">{cat.name}</span>
                                  ) : (
                                    cat.name
                                  )}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {tx.description}
                      </span>
                      {(tx.merchantProfile?.displayName || tx.merchantName) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {tx.merchantProfile?.displayName || tx.merchantName}
                        </p>
                      )}
                      <input
                        defaultValue={tx.notes || ""}
                        onBlur={(e) => onUpdateNotes?.(tx.id, e.target.value)}
                        placeholder="Ajouter une note..."
                        className="mt-1 w-full max-w-xs rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs text-gray-500 dark:text-gray-400"
                      />
                      <div className="mt-1 flex items-center gap-2">
                        <label className="inline-flex h-7 cursor-pointer items-center rounded border border-gray-200 dark:border-gray-700 px-2 text-[11px] text-gray-500 dark:text-gray-400">
                          Ajouter photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              onUploadPhoto?.(tx.id, file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        {tx.photoUrl && (
                          <img
                            src={tx.photoUrl}
                            alt="Photo transaction"
                            className="h-7 w-7 rounded object-cover"
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {tx.account.name}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-semibold whitespace-nowrap",
                      tx.amount >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {formatCurrency(tx.amount, tx.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} transaction{pagination.total > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                pagination.page <= 1
                  ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (pagination.totalPages <= 7) return true;
                if (p === 1 || p === pagination.totalPages) return true;
                return Math.abs(p - pagination.page) <= 1;
              })
              .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-gray-400 dark:text-gray-500"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => onPageChange?.(item)}
                    className={cn(
                      "min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors",
                      item === pagination.page
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                pagination.page >= pagination.totalPages
                  ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
