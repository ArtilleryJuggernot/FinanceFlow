export function normalizeMerchantName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\b(v\d+|x\d+)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
