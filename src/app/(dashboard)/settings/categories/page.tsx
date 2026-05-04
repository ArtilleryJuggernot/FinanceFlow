"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

type CategoryNode = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
  parentId?: string | null;
  children?: CategoryNode[];
};

export default function SettingsCategoriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    icon: "tag",
    color: "#6366f1",
    type: "expense" as "income" | "expense",
    parentId: "",
  });
  const [edits, setEdits] = useState<
    Record<
      string,
      { name: string; icon: string; color: string; type: "income" | "expense"; parentId: string }
    >
  >({});

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          icon: form.icon,
          color: form.color,
          type: form.type,
          parentId: form.parentId || null,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setForm((prev) => ({ ...prev, name: "", parentId: "" }));
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  const updateCategory = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; icon: string; color: string; type: "income" | "expense"; parentId: string };
    }) => {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: data.name,
          icon: data.icon,
          color: data.color,
          type: data.type,
          parentId: data.parentId || null,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const flatCategories = useMemo(
    () =>
      (categories || []).flatMap((parent: CategoryNode) => [parent, ...(parent.children || [])]),
    [categories]
  );

  function getEditState(cat: CategoryNode) {
    return (
      edits[cat.id] || {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        parentId: cat.parentId || "",
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des catégories</h1>
        <p className="text-gray-500 dark:text-gray-400">
          CRUD complet des catégories parent et enfant.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm"
            placeholder="Nom"
          />
          <input
            value={form.icon}
            onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
            className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm"
            placeholder="Icône"
          />
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
            className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2"
          />
          <select
            value={form.type}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, type: e.target.value as "income" | "expense" }))
            }
            className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm"
          >
            <option value="expense">Dépense</option>
            <option value="income">Revenu</option>
          </select>
          <select
            value={form.parentId}
            onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
            className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm"
          >
            <option value="">Parent (facultatif)</option>
            {(categories || []).map((parent: CategoryNode) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => createCategory.mutate()}
          disabled={!form.name || createCategory.isPending}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Ajouter
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Icône</th>
                <th className="px-4 py-3 text-left">Couleur</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {flatCategories.map((cat: CategoryNode) => (
                <tr key={cat.id}>
                  <td className="px-4 py-3">
                    <input
                      value={getEditState(cat).name}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [cat.id]: { ...getEditState(cat), name: e.target.value },
                        }))
                      }
                      className="h-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={getEditState(cat).type}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [cat.id]: {
                            ...getEditState(cat),
                            type: e.target.value as "income" | "expense",
                          },
                        }))
                      }
                      className="h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2"
                    >
                      <option value="expense">Dépense</option>
                      <option value="income">Revenu</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={getEditState(cat).icon}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [cat.id]: { ...getEditState(cat), icon: e.target.value },
                        }))
                      }
                      className="h-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getEditState(cat).color}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [cat.id]: { ...getEditState(cat), color: e.target.value },
                          }))
                        }
                        className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1"
                      />
                      <select
                        value={getEditState(cat).parentId}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [cat.id]: { ...getEditState(cat), parentId: e.target.value },
                          }))
                        }
                        className="h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 text-xs"
                      >
                        <option value="">Pas de parent</option>
                        {(categories || [])
                          .filter((parent: CategoryNode) => parent.id !== cat.id)
                          .map((parent: CategoryNode) => (
                            <option key={parent.id} value={parent.id}>
                              {parent.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        updateCategory.mutate({
                          id: cat.id,
                          data: getEditState(cat),
                        })
                      }
                      className="mr-2 inline-flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory.mutate(cat.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
