"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { formatCurrency } from "@/lib/currency";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n";
import type { CurrencyCode, IncomeKind, PaymentMethod, TransactionType } from "@/types/database";

type ActionResult = { error: string } | { success: true; toast: string };

interface ParsedInput {
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  fxRate: number | null;
  merchant: string;
  date: string;
  categoryId: string | null;
  incomeKind: IncomeKind | null;
  paymentMethod: PaymentMethod | null;
  note: string;
  isRecurring: boolean;
}

function parseInput(formData: FormData, t: Translator["t"]): { error: string } | { value: ParsedInput } {
  const type: TransactionType = formData.get("type") === "income" ? "income" : "cost";
  const amount = parseFloat(String(formData.get("amount") ?? "").replace(",", "."));
  const currency = String(formData.get("currency") ?? "BAM") as CurrencyCode;
  const merchant = String(formData.get("merchant") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const incomeKind = (String(formData.get("incomeKind") ?? "") || null) as IncomeKind | null;
  const paymentMethod = (String(formData.get("paymentMethod") ?? "") || null) as PaymentMethod | null;
  const note = String(formData.get("note") ?? "").trim();
  const isRecurring = formData.get("isRecurring") === "on";
  const fxRateRaw = String(formData.get("fxRate") ?? "").replace(",", ".");
  const fxRate = fxRateRaw ? parseFloat(fxRateRaw) : null;

  if (!(amount > 0)) return { error: t("err.amount") };
  if (!merchant) {
    return { error: type === "income" ? t("err.sourceReq") : t("err.merchantReq") };
  }
  if (!date) return { error: t("err.date") };

  return {
    value: { type, amount, currency, fxRate, merchant, date, categoryId, incomeKind, paymentMethod, note, isRecurring },
  };
}

/** Resolves the entered amount (possibly in a foreign currency) into the workspace's base-currency amount + fx snapshot. */
function resolveAmount(input: ParsedInput, baseCurrency: CurrencyCode, t: Translator["t"]): { error: string } | { amount: number; fx: { fx_amount: number; fx_currency: CurrencyCode; fx_rate: number } | null } {
  if (input.currency === baseCurrency) {
    return { amount: Math.round(input.amount * 100) / 100, fx: null };
  }
  if (!(input.fxRate && input.fxRate > 0)) {
    return { error: t("err.rateReq", { cur: input.currency, base: baseCurrency }) };
  }
  const baseAmount = Math.round(input.amount * input.fxRate * 100) / 100;
  return {
    amount: baseAmount,
    fx: { fx_amount: Math.round(input.amount * 100) / 100, fx_currency: input.currency, fx_rate: input.fxRate },
  };
}

function revalidateAll() {
  revalidatePath("/overview");
  revalidatePath("/activity");
  revalidatePath("/summary");
}

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const { t, locale } = await getT();
  const current = await getCurrentWorkspace();
  if (!current) return { error: t("err.noWorkspace") };

  const parsed = parseInput(formData, t);
  if ("error" in parsed) return { error: parsed.error };
  const input = parsed.value;

  const resolved = resolveAmount(input, current.workspace.base_currency, t);
  if ("error" in resolved) return { error: resolved.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("err.signedOut") };

  const { error } = await supabase.from("transactions").insert({
    workspace_id: current.workspace.id,
    user_id: user.id,
    type: input.type,
    occurred_on: input.date,
    merchant_or_source: input.merchant,
    category_id: input.type === "cost" ? input.categoryId : null,
    income_kind: input.type === "income" ? input.incomeKind : null,
    payment_method: input.type === "cost" ? input.paymentMethod : null,
    amount: resolved.amount,
    fx_amount: resolved.fx?.fx_amount ?? null,
    fx_currency: resolved.fx?.fx_currency ?? null,
    fx_rate: resolved.fx?.fx_rate ?? null,
    note: input.note || null,
    is_recurring: input.isRecurring,
  });

  if (error) return { error: error.message };

  revalidateAll();
  const amountLabel = formatCurrency(resolved.amount, current.workspace.base_currency, 2, locale);
  return {
    success: true,
    toast: t(input.type === "income" ? "toast.addedIncome" : "toast.addedCost", {
      amount: amountLabel,
      name: input.merchant,
    }),
  };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const { t, locale } = await getT();
  const current = await getCurrentWorkspace();
  if (!current) return { error: t("err.noWorkspace") };

  const parsed = parseInput(formData, t);
  if ("error" in parsed) return { error: parsed.error };
  const input = parsed.value;

  const resolved = resolveAmount(input, current.workspace.base_currency, t);
  if ("error" in resolved) return { error: resolved.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      occurred_on: input.date,
      merchant_or_source: input.merchant,
      category_id: input.type === "cost" ? input.categoryId : null,
      income_kind: input.type === "income" ? input.incomeKind : null,
      payment_method: input.type === "cost" ? input.paymentMethod : null,
      amount: resolved.amount,
      fx_amount: resolved.fx?.fx_amount ?? null,
      fx_currency: resolved.fx?.fx_currency ?? null,
      fx_rate: resolved.fx?.fx_rate ?? null,
      note: input.note || null,
      is_recurring: input.isRecurring,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateAll();
  const amountLabel = formatCurrency(resolved.amount, current.workspace.base_currency, 2, locale);
  return {
    success: true,
    toast: t(input.type === "income" ? "toast.savedIncome" : "toast.savedCost", {
      amount: amountLabel,
      name: input.merchant,
    }),
  };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const { t } = await getT();
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateAll();
  return { success: true, toast: t("toast.deleted") };
}
