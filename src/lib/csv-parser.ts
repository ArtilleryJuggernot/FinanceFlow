import Papa from "papaparse";
import * as XLSX from "xlsx";
import { hashTransaction } from "./utils";

export type CSVMapping = {
  date: string;
  amount: string;
  description: string;
  currency?: string;
};

export type ParsedTransaction = {
  date: string;
  amount: number;
  description: string;
  merchantName: string | null;
  currency: string;
  hash: string;
};

// ─── Crédit Agricole XLSX Parser ─────────────────────────────────────────

function excelDateToISO(serial: number): string {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(epoch.getTime() + serial * 86400000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function extractMerchantFromCA(libelle: string): string | null {
  const lines = libelle.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const secondLine = lines[1];

  // "X2348 SUPER U LYON         09/04"  → extract merchant name
  const cardMatch = secondLine.match(/^X\d{4}\s+(.+?)\s+\d{2}\/\d{2}\s*$/);
  if (cardMatch) {
    return cardMatch[1].trim();
  }

  // For prélèvements: first meaningful token
  // "SPL Relation Usagers TCL ..."
  const words = secondLine.split(/\s+/);
  if (words.length >= 2) {
    return words.slice(0, 4).join(" ").trim();
  }

  return secondLine.trim() || null;
}

function cleanDescription(libelle: string): string {
  return libelle
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseXLSX(buffer: ArrayBuffer): {
  transactions: ParsedTransaction[];
  accountInfo: { name: string; number: string; balance: number } | null;
} {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let accountInfo: { name: string; number: string; balance: number } | null = null;
  let dataStartIdx = -1;

  // Parse header to find account info and data start row
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const first = String(row[0] || "");

    // Account holder name: "M.       JACQUEL HUGO" or "Mme ..."
    if (/^(M\.|Mme|Mr|Mlle)\s+/i.test(first)) {
      const name = first.replace(/^(M\.|Mme|Mr|Mlle)\s+/i, "").trim();
      accountInfo = { name, number: "", balance: 0 };
    }

    // Account number: "Compte de Dépôt n° 43661728877"
    if (/Compte.*n°\s*(\d+)/.test(first)) {
      const match = first.match(/n°\s*(\d+)/);
      if (match && accountInfo) accountInfo.number = match[1];
    }

    // Balance: [null, "Solde au ...", " 58,83 €"]
    if (row.length >= 3 && String(row[1] || "").includes("Solde au")) {
      const balStr = String(row[2] || "")
        .replace(/[€\s]/g, "")
        .replace(",", ".");
      if (accountInfo) accountInfo.balance = parseFloat(balStr) || 0;
    }

    // Header row: ["Date", "Libellé", "Débit euros", "Crédit euros"]
    if (
      first === "Date" &&
      String(row[1] || "").toLowerCase().includes("libell")
    ) {
      dataStartIdx = i + 1;
    }
  }

  if (dataStartIdx === -1) {
    // Fallback: find first row where col 0 is a number (Excel date serial)
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i]?.[0];
      if (typeof v === "number" && v > 40000 && v < 55000) {
        dataStartIdx = i;
        break;
      }
    }
  }

  if (dataStartIdx === -1) {
    throw new Error(
      "Format de fichier non reconnu. Impossible de trouver les données de transactions."
    );
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const dateVal = row[0];
    const libelle = String(row[1] || "").trim();
    const debit = row[2];
    const credit = row[3];

    if (!dateVal || !libelle) continue;

    // Parse date (Excel serial number or string)
    let dateISO: string | null = null;
    if (typeof dateVal === "number") {
      dateISO = excelDateToISO(dateVal);
    } else {
      dateISO = parseDate(String(dateVal));
    }
    if (!dateISO) continue;

    // Amount: debit is negative (expense), credit is positive (income)
    let amount = 0;
    if (typeof debit === "number" && debit > 0) {
      amount = -debit;
    } else if (typeof credit === "number" && credit > 0) {
      amount = credit;
    } else {
      // Try parsing strings
      const debitStr = String(debit || "").replace(/[€\s]/g, "").replace(",", ".");
      const creditStr = String(credit || "").replace(/[€\s]/g, "").replace(",", ".");
      const debitNum = parseFloat(debitStr);
      const creditNum = parseFloat(creditStr);

      if (!isNaN(debitNum) && debitNum > 0) {
        amount = -debitNum;
      } else if (!isNaN(creditNum) && creditNum > 0) {
        amount = creditNum;
      } else {
        continue;
      }
    }

    const description = cleanDescription(libelle);
    const merchantName = extractMerchantFromCA(libelle);

    transactions.push({
      date: dateISO,
      amount,
      description,
      merchantName,
      currency: "EUR",
      hash: hashTransaction(dateISO, amount, description),
    });
  }

  return { transactions, accountInfo };
}

// ─── CSV Parser ──────────────────────────────────────────────────────────

export function parseCSV(
  content: string,
  mapping: CSVMapping
): ParsedTransaction[] {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0) {
    throw new Error(`Erreur CSV : ${result.errors[0].message}`);
  }

  const transactions: ParsedTransaction[] = [];

  for (const row of result.data as Record<string, string>[]) {
    const dateStr = row[mapping.date]?.trim();
    const amountStr = row[mapping.amount]?.trim();
    const description = row[mapping.description]?.trim();

    if (!dateStr || !amountStr || !description) continue;

    const amount = parseFloat(
      amountStr.replace(/\s/g, "").replace(",", ".")
    );

    if (isNaN(amount)) continue;

    const date = parseDate(dateStr);
    if (!date) continue;

    const currency = mapping.currency
      ? row[mapping.currency]?.trim() || "EUR"
      : "EUR";

    transactions.push({
      date,
      amount,
      description,
      merchantName: null,
      currency,
      hash: hashTransaction(date, amount, description),
    });
  }

  return transactions;
}

function parseDate(dateStr: string): string | null {
  const match1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match1) {
    return `${match1[3]}-${match1[2].padStart(2, "0")}-${match1[1].padStart(2, "0")}`;
  }

  const match2 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match2) return dateStr;

  const match3 = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match3) {
    return `${match3[3]}-${match3[2].padStart(2, "0")}-${match3[1].padStart(2, "0")}`;
  }

  const match4 = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match4) {
    return `${match4[3]}-${match4[2].padStart(2, "0")}-${match4[1].padStart(2, "0")}`;
  }

  return null;
}

export function detectCSVColumns(content: string): string[] {
  const result = Papa.parse(content, {
    header: true,
    preview: 1,
  });

  return result.meta.fields || [];
}

// ─── OFX Parser ──────────────────────────────────────────────────────────

export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];

    const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
    const amountMatch = block.match(/<TRNAMT>([-\d.,]+)/);
    const nameMatch = block.match(/<NAME>([^<\n]+)/);
    const memoMatch = block.match(/<MEMO>([^<\n]+)/);

    if (!dateMatch || !amountMatch) continue;

    const rawDate = dateMatch[1];
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    const amount = parseFloat(amountMatch[1].replace(",", "."));
    const description = (nameMatch?.[1] || memoMatch?.[1] || "Transaction").trim();

    transactions.push({
      date,
      amount,
      description,
      merchantName: null,
      currency: "EUR",
      hash: hashTransaction(date, amount, description),
    });
  }

  return transactions;
}
