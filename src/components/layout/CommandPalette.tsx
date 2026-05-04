"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const QUICK_SECTIONS = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/recurring", label: "Abonnements" },
  { href: "/merchants", label: "Marchands" },
  { href: "/goals", label: "Objectifs" },
  { href: "/accounts", label: "Comptes" },
  { href: "/settings/categories", label: "Catégories" },
  { href: "/ai", label: "Intelligence IA" },
  { href: "/guide", label: "Guide" },
  { href: "/settings", label: "Paramètres" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenPalette = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpenPalette);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpenPalette);
    };
  }, []);

  const filteredSections = useMemo(() => {
    if (!query.trim()) return QUICK_SECTIONS;
    const q = query.toLowerCase();
    return QUICK_SECTIONS.filter((section) => section.label.toLowerCase().includes(q));
  }, [query]);

  const { data: merchants } = useQuery({
    queryKey: ["command-merchants", query],
    enabled: open && query.trim().length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({
        search: query.trim(),
        page: "1",
        limit: "8",
      });
      const res = await fetch(`/api/analytics/merchants?${params.toString()}`);
      return res.json();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-20 max-w-2xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 dark:border-gray-700 p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une section ou un marchand..."
            className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="max-h-[60vh] overflow-auto p-3 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Sections
            </p>
            <div className="space-y-1">
              {filteredSections.map((section) => (
                <button
                  key={section.href}
                  onClick={() => {
                    router.push(section.href);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Marchands
            </p>
            <div className="space-y-1">
              {(merchants?.merchants || []).map(
                (merchant: { merchantPattern: string; displayName: string; topCategory: string }) => (
                  <button
                    key={merchant.merchantPattern}
                    onClick={() => {
                      router.push(`/merchants/${encodeURIComponent(merchant.merchantPattern)}`);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <p className="text-sm text-gray-800 dark:text-gray-100">{merchant.displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{merchant.topCategory}</p>
                  </button>
                )
              )}
              {query.trim().length >= 2 && (merchants?.merchants || []).length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  Aucun marchand trouvé
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
