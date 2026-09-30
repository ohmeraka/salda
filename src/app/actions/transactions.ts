"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { formatCurrency } from "@/lib/currency";
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

function parseInput(formData: FormData): { error: string } | { value: ParsedInput } {
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

  if (!(amount > 0)) return { error: "Enter an amount above 0" };
  if (!merchant) {
    return { error: type === "income" ? "Add a source, e.g. your employer" : "Add a merchant or short description" };
  }
  if (!date) return { error: "Pick a date" };

  return {
    value: { type, amount, currency, fxRate, merchant, date, categoryId, incomeKind, paymentMethod, note, isRecurring },
  };
}

/** Resolves the entered amount (possibly in a foreign currency) into the workspace's base-currency amount + fx snapshot. */
function resolveAmount(input: ParsedInput, baseCurrency: CurrencyCode): { error: string } | { amount: number; fx: { fx_amount: number; fx_currency: CurrencyCode; fx_rate: number } | null } {
  if (input.currency === baseCurrency) {
    return { amount: Math.round(input.amount * 100) / 100, fx: null };
  }
  if (!(input.fxRate && input.fxRate > 0)) {
    return { error: `Enter the exchange rate (1 ${input.currency} = ? ${baseCurrency})` };
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
  const current = await getCurrentWorkspace();
  if (!current) return { error: "No workspace found." };

  const parsed = parseInput(formData);
  if ("error" in parsed) return { error: parsed.error };
  const input = parsed.value;

  const resolved = resolveAmount(input, current.workspace.base_currency);
  if ("error" in resolved) return { error: resolved.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You've been signed out. Please sign in again." };

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
  const amountLabel = formatCurrency(resolved.amount, current.workspace.base_currency);
  return {
    success: true,
    toast:
      input.type === "income" ? `Added · +${amountLabel} from ${input.merchant}` : `Added · ${amountLabel} at ${input.merchant}`,
  };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const current = await getCurrentWorkspace();
  if (!current) return { error: "No workspace found." };

  const parsed = parseInput(formData);
  if ("error" in parsed) return { error: parsed.error };
  const input = parsed.value;

  const resolved = resolveAmount(input, current.workspace.base_currency);
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
  const amountLabel = formatCurrency(resolved.amount, current.workspace.base_currency);
  return {
    success: true,
    toast: input.type === "income" ? `Saved · +${amountLabel} from ${input.merchant}` : `Saved · ${amountLabel} at ${input.merchant}`,
  };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateAll();
  return { success: true, toast: "Entry deleted" };
}
