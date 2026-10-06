import type { Translator } from "@/lib/i18n";
import type { IncomeKind, PaymentMethod } from "@/types/database";

export function paymentLabel(method: PaymentMethod | null, t: Translator["t"]): string {
  if (!method) return "";
  return t(method === "card" ? "payment.card" : method === "cash" ? "payment.cash" : "payment.transfer");
}

export function incomeKindLabel(kind: IncomeKind | null, t: Translator["t"]): string {
  if (!kind) return "";
  return t(kind === "salary" ? "incomeKind.salary" : "incomeKind.additional");
}
