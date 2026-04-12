"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface Account {
  id: string;
  name: string;
}

interface ImportDialogProps {
  accounts: Account[];
  open: boolean;
  onClose: () => void;
}

type Step = "upload" | "mapping" | "result";

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export function ImportDialog({ accounts, open, onClose }: ImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ date: "", amount: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setAccountId("");
    setFile(null);
    setCsvHeaders([]);
    setMapping({ date: "", amount: "", description: "" });
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setError(null);

    const name = selectedFile.name.toLowerCase();
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (isXlsx) {
      setCsvHeaders([]);
      return;
    }

    if (name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = Papa.parse(text, { header: true, preview: 1 });
        const headers = parsed.meta.fields || [];
        setCsvHeaders(headers);

        const dateCol = headers.find((h) =>
          /date|jour|dt/i.test(h)
        );
        const amountCol = headers.find((h) =>
          /montant|amount|somme|valeur/i.test(h)
        );
        const descCol = headers.find((h) =>
          /description|libel|label|motif|ref/i.test(h)
        );

        setMapping({
          date: dateCol || headers[0] || "",
          amount: amountCol || headers[1] || "",
          description: descCol || headers[2] || "",
        });
      };
      reader.readAsText(selectedFile);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  function isXlsxFile() {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls");
  }

  async function handleNext() {
    if (!file) {
      setError("Veuillez sélectionner un fichier");
      return;
    }

    // XLSX files can auto-create accounts, no account selection required
    if (!isXlsxFile() && !accountId) {
      setError("Veuillez sélectionner un compte");
      return;
    }

    const isCSV = file.name.toLowerCase().endsWith(".csv");

    if (isCSV && step === "upload") {
      if (csvHeaders.length === 0) {
        setError("Impossible de lire les colonnes du fichier CSV");
        return;
      }
      setStep("mapping");
      setError(null);
      return;
    }

    await doImport();
  }

  async function doImport() {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (accountId) {
        formData.append("accountId", accountId);
      }
      if (isXlsxFile()) {
        formData.append("autoCreateAccount", "true");
      }

      const isCSV = file.name.toLowerCase().endsWith(".csv");
      if (isCSV) {
        formData.append("mapping", JSON.stringify(mapping));
      }

      const res = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'import");
      }

      const data = await res.json();
      setResult({ imported: data.imported, skipped: data.skipped, total: data.total });
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const selectClasses =
    "w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Importer des transactions
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 pt-4">
          {(["upload", "mapping", "result"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step === s
                    ? "bg-indigo-600 text-white"
                    : (["upload", "mapping", "result"].indexOf(step) > i)
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                )}
              >
                {["upload", "mapping", "result"].indexOf(step) > i ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  step === s
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                )}
              >
                {i === 0 ? "Fichier" : i === 1 ? "Colonnes" : "Résultat"}
              </span>
              {i < 2 && (
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === "upload" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Compte de destination
                  {file && isXlsxFile() && (
                    <span className="ml-2 text-xs font-normal text-indigo-500">
                      (optionnel pour les fichiers Excel bancaires)
                    </span>
                  )}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={selectClasses}
                >
                  <option value="">
                    {file && isXlsxFile()
                      ? "Auto-détection depuis le fichier"
                      : "Sélectionner un compte"}
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Fichier bancaire
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                    dragActive
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                      : file
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.ofx,.qfx,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-emerald-500" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} Ko
                      </p>
                      {isXlsxFile() && (
                        <p className="text-xs text-indigo-500 mt-1">
                          Format bancaire Excel detecté — import direct sans mapping
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Glissez-déposez votre fichier ici
                      </p>
                      <p className="text-xs text-gray-400">
                        CSV, OFX, XLSX (Crédit Agricole, etc.)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === "mapping" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Associez les colonnes de votre fichier CSV aux champs requis.
              </p>
              {(
                [
                  { key: "date", label: "Date" },
                  { key: "amount", label: "Montant" },
                  { key: "description", label: "Description" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                  </label>
                  <select
                    value={mapping[key]}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={selectClasses}
                  >
                    <option value="">Sélectionner une colonne</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {step === "result" && result && (
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Import terminé
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {result.total} transaction{result.total > 1 ? "s" : ""} traitée{result.total > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {result.imported}
                  </p>
                  <p className="text-xs text-gray-500">Importée{result.imported > 1 ? "s" : ""}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-gray-500">Doublon{result.skipped > 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          {step === "result" ? (
            <button
              onClick={handleClose}
              className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Fermer
            </button>
          ) : (
            <>
              <button
                onClick={step === "mapping" ? () => setStep("upload") : handleClose}
                className="h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
              >
                {step === "mapping" ? "Retour" : "Annuler"}
              </button>
              <button
                onClick={step === "mapping" ? doImport : handleNext}
                disabled={loading}
                className={cn(
                  "h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center gap-2",
                  loading && "opacity-70 cursor-not-allowed"
                )}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {step === "mapping" ? "Importer" : "Suivant"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
