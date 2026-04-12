"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2,
  Plus,
  Building2,
  Trash2,
  RefreshCw,
  Link2,
  CreditCard,
  Landmark,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Account = {
  id: string;
  name: string;
  iban: string | null;
  currency: string;
  balance: number;
  type: string;
  isManual: boolean;
  bankConnection: {
    institutionName: string;
    status: string;
    expiresAt: string;
  } | null;
};

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showBankConnect, setShowBankConnect] = useState(false);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [accountType, setAccountType] = useState("checking");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      return res.json();
    },
  });

  const createAccount = useMutation({
    mutationFn: async (data: { name: string; balance: number; type: string }) => {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowForm(false);
      setName("");
      setBalance("");
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const syncAccounts = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bank/sync", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const totalBalance = accounts?.reduce((sum: number, a: Account) => sum + a.balance, 0) || 0;
  const typeLabels: Record<string, string> = {
    checking: "Compte courant",
    savings: "Livret d'épargne",
    credit: "Carte de crédit",
    investment: "Investissement",
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
            Comptes bancaires
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gérez vos comptes et connexions bancaires
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncAccounts.mutate()}
            disabled={syncAccounts.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {syncAccounts.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Synchroniser
          </button>
          <button
            onClick={() => setShowBankConnect(!showBankConnect)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Connecter une banque
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Compte manuel
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white">
        <p className="text-sm opacity-80">Solde total</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-80 mt-1">
          {accounts?.length || 0} compte{(accounts?.length || 0) > 1 ? "s" : ""}
        </p>
      </div>

      {showBankConnect && (
        <BankConnectSection onClose={() => setShowBankConnect(false)} />
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createAccount.mutate({
              name,
              balance: parseFloat(balance || "0"),
              type: accountType,
            });
          }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Ajouter un compte manuel
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du compte
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Mon compte courant"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Solde initial
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="1500.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="checking">Compte courant</option>
                <option value="savings">Livret d&apos;épargne</option>
                <option value="credit">Carte de crédit</option>
                <option value="investment">Investissement</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createAccount.isPending}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts?.map((account: Account) => (
          <div
            key={account.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  {account.type === "savings" ? (
                    <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ) : account.type === "credit" ? (
                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {account.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {account.bankConnection
                      ? account.bankConnection.institutionName
                      : typeLabels[account.type] || "Compte manuel"}
                    {account.iban && ` — ${account.iban.slice(-4)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteAccount.mutate(account.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p
              className={`text-2xl font-bold ${
                account.balance >= 0
                  ? "text-gray-900 dark:text-white"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(account.balance, account.currency)}
            </p>
            {account.bankConnection && (
              <p className="text-xs text-gray-400 mt-2">
                Expire le {formatDate(account.bankConnection.expiresAt)}
              </p>
            )}
          </div>
        ))}
      </div>

      {(!accounts || accounts.length === 0) && (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucun compte
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Connectez une banque ou ajoutez un compte manuel
          </p>
        </div>
      )}
    </div>
  );
}

function BankConnectSection({ onClose }: { onClose: () => void }) {
  const [country, setCountry] = useState("FR");
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  const { data: institutions, isLoading } = useQuery({
    queryKey: ["institutions", country],
    queryFn: async () => {
      const res = await fetch(`/api/bank/institutions?country=${country}`);
      return res.json();
    },
  });

  const handleConnect = async (institutionId: string, institutionName: string) => {
    setConnecting(institutionId);
    try {
      const res = await fetch("/api/bank/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, institutionName }),
      });
      const data = await res.json();
      if (data.link) {
        window.location.href = data.link;
      }
    } catch {
      setConnecting(null);
    }
  };

  const filtered = institutions?.filter(
    (i: { name: string }) =>
      i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Connecter une banque
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="FR">France</option>
          <option value="BE">Belgique</option>
          <option value="DE">Allemagne</option>
          <option value="ES">Espagne</option>
          <option value="IT">Italie</option>
          <option value="NL">Pays-Bas</option>
          <option value="LU">Luxembourg</option>
          <option value="CH">Suisse</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          placeholder="Rechercher une banque..."
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
          {filtered?.slice(0, 20).map((inst: { id: string; name: string; logo: string }) => (
            <button
              key={inst.id}
              onClick={() => handleConnect(inst.id, inst.name)}
              disabled={connecting === inst.id}
              className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors text-left disabled:opacity-50"
            >
              {inst.logo && (
                <img
                  src={inst.logo}
                  alt={inst.name}
                  className="w-8 h-8 rounded"
                />
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {inst.name}
              </span>
              {connecting === inst.id && (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
