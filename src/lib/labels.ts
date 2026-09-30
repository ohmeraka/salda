import type { IncomeKind, PaymentMethod } from "@/types/database";

export function paymentLabel(method: PaymentMethod | null): string {
  if (!method) return "";
  return method === "card" ? "Card" : method === "cash" ? "Cash" : "Transfer";
}

export function incomeKindLabel(kind: IncomeKind | null): string {
  if (!kind) return "";
  return kind === "salary" ? "Salary" : "Additional income";
}
