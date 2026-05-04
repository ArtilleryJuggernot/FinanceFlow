"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function normalizeDisplayImageUrl(url?: string | null): string {
  if (!url) return "";
  const cleaned = url.trim().replace(/\\/g, "/");
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) return cleaned;
  if (cleaned.startsWith("/")) return cleaned;
  return `/${cleaned}`;
}

export default function MerchantDetailPage() {
  const queryClient = useQueryClient();
  const params = useParams<{ merchantPattern: string }>();
  const merchantRef = decodeURIComponent(params.merchantPattern);
  const [notesDraft, setNotesDraft] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [avatarUrlDraft, setAvatarUrlDraft] = useState("");
  const [avatarSearch, setAvatarSearch] = useState("");
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-detail", merchantRef],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/${encodeURIComponent(merchantRef)}`);
      return res.json();
    },
  });

  useEffect(() => {
    if (!data?.profile) return;
    setNotesDraft(data.profile.notes || "");
    setDisplayNameDraft(data.profile.displayName || "");
    setAvatarUrlDraft(data.profile.avatarUrl || "");
    setAvatarSearch("");
    setAvatarBroken(false);
  }, [data?.profile]);

  const { data: avatarLibrary } = useQuery({
    queryKey: ["merchant-detail-avatar-library", avatarSearch, data?.merchantId],
    enabled: !!data?.merchantId,
    queryFn: async () => {
      const p = new URLSearchParams({
        search: avatarSearch.trim(),
        limit: "20",
      });
      const res = await fetch(`/api/uploads/merchant-avatar?${p.toString()}`);
      return res.json();
    },
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recurring/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: data?.merchantId,
          merchantPattern: data?.merchantPattern,
          displayName: displayNameDraft,
          avatarUrl: avatarUrlDraft,
          notes: notesDraft,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-detail", merchantRef] });
      queryClient.invalidateQueries({ queryKey: ["merchant-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
  const saveTransactionNote = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-detail", merchantRef] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
  const saveTransactionPhoto = useMutation({
    mutationFn: async ({ id, photoUrl }: { id: string; photoUrl: string }) => {
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, photoUrl }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-detail", merchantRef] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  async function uploadFromDetail(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/uploads/merchant-avatar", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      setUploading(false);
      return;
    }

    const url = uploadData.url as string;
    setAvatarUrlDraft(url);
    setAvatarBroken(false);
    await fetch("/api/recurring/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: data?.merchantId,
        merchantPattern: data?.merchantPattern,
        avatarUrl: url,
      }),
    });
    queryClient.invalidateQueries({ queryKey: ["merchant-detail", merchantRef] });
    queryClient.invalidateQueries({ queryKey: ["merchant-analytics"] });
    setUploading(false);
  }

  async function uploadTransactionPhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/uploads/transaction-photo", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) return;
    saveTransactionPhoto.mutate({ id, photoUrl: uploadData.url });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const trendData = (data?.trend || [])
    .map((item: { month: string; amount: number }) => {
      const [year, month] = item.month.split("-");
      return {
        ...item,
        sortKey: Number(`${year}${month}`),
        label: `${month}/${year.slice(-2)}`,
      };
    })
    .sort((a: { sortKey: number }, b: { sortKey: number }) => a.sortKey - b.sortKey);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          {avatarUrlDraft && !avatarBroken ? (
            <div className="h-14 w-28 overflow-hidden rounded-md bg-gray-50 p-1 dark:bg-gray-800">
              <img
                src={normalizeDisplayImageUrl(avatarUrlDraft)}
                alt={displayNameDraft || merchantRef}
                className="h-full w-full object-contain"
                onError={() => setAvatarBroken(true)}
              />
            </div>
          ) : (
            <div className="h-14 w-28 rounded-md bg-gray-100 dark:bg-gray-800" />
          )}
          <div className="min-w-0">
            <input
              value={displayNameDraft}
              onChange={(e) => setDisplayNameDraft(e.target.value)}
              className="h-10 w-full max-w-xl rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-2xl font-bold text-gray-900 dark:text-white"
            />
            <p className="text-gray-500 dark:text-gray-400">{data?.merchantPattern || merchantRef}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Profil marchand</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">URL / PATH image</label>
            <input
              value={avatarUrlDraft}
              onChange={(e) => setAvatarUrlDraft(e.target.value)}
              placeholder="/uploads/merchants/... ou URL complète"
              className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              {uploading ? "Upload..." : "Uploader une image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadFromDetail(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              (Tu peux aussi choisir une image déjà uploadée ci-dessous)
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Réutiliser une image existante
            </label>
            <input
              value={avatarSearch}
              onChange={(e) => setAvatarSearch(e.target.value)}
              placeholder="Filtrer par nom de fichier upload..."
              className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
            />
            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
              {(avatarLibrary || []).length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  Aucune image trouvée.
                </p>
              ) : (
                (avatarLibrary || []).map(
                  (item: { filename: string; url: string; updatedAt: string }) => (
                    <button
                      key={item.filename}
                      onClick={() => {
                        setAvatarUrlDraft(item.url);
                        setAvatarBroken(false);
                      }}
                      className="flex w-full items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="h-8 w-14 overflow-hidden rounded bg-gray-50 p-0.5 dark:bg-gray-800">
                        <img
                          src={item.url}
                          alt={item.filename}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-gray-700 dark:text-gray-200">{item.filename}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {new Date(item.updatedAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Notes</label>
            <textarea
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Notes associées au marchand..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => saveProfile.mutate()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Enregistrer profil
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data?.stats?.transactionCount || 0}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total dépensé</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(data?.stats?.totalSpent || 0)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Panier moyen</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data?.stats?.averageAmount || 0)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Evolution mensuelle</h2>
        <div className="h-[320px] w-full rounded-xl bg-gradient-to-b from-indigo-50/60 to-transparent dark:from-indigo-950/30 p-2">
          {trendData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Pas assez de données pour afficher l'évolution.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="merchantTrendStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#d1d5db" strokeOpacity={0.45} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#d1d5db", strokeOpacity: 0.5 }}
                  tickLine={{ stroke: "#d1d5db", strokeOpacity: 0.5 }}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#d1d5db", strokeOpacity: 0.5 }}
                  tickLine={{ stroke: "#d1d5db", strokeOpacity: 0.5 }}
                  tickFormatter={(value) => `${value}€`}
                />
                <Tooltip
                  formatter={(value: unknown) => {
                    const normalized = Array.isArray(value) ? value[0] : value;
                    const numeric =
                      typeof normalized === "number"
                        ? normalized
                        : Number(String(normalized ?? 0));
                    return formatCurrency(Number.isFinite(numeric) ? numeric : 0);
                  }}
                  labelFormatter={(label) => `Période: ${label}`}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "rgba(255,255,255,0.98)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="url(#merchantTrendStroke)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Transactions récentes</h2>
        <div className="space-y-2">
          {(data?.transactions || []).map(
            (tx: {
              id: string;
              date: string;
              description: string;
              amount: number;
              notes?: string | null;
              category: { name: string } | null;
              photoUrl?: string | null;
            }) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2"
              >
                <div className="flex items-start gap-3">
                  {tx.photoUrl ? (
                    <img
                      src={tx.photoUrl}
                      alt="Photo transaction"
                      className="h-12 w-12 rounded object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-gray-100 dark:bg-gray-800" />
                  )}
                  <div>
                  <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateShort(tx.date)} - {tx.category?.name || "Non catégorisé"}
                  </p>
                  <label className="mt-1 inline-flex h-7 cursor-pointer items-center rounded border border-gray-200 dark:border-gray-700 px-2 text-[11px] text-gray-600 dark:text-gray-300">
                    Ajouter / remplacer photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        uploadTransactionPhoto(tx.id, file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <textarea
                    rows={2}
                    defaultValue={tx.notes || ""}
                    onBlur={(e) =>
                      saveTransactionNote.mutate({
                        id: tx.id,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Note de transaction..."
                    className="mt-1 w-full min-w-[280px] rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
                  />
                  </div>
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
