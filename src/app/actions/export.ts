"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { paymentLabel } from "@/lib/labels";

interface ExportRow {
  type: "cost" | "income";
  occurred_on: string;
  merchant_or_source: string;
  income_kind: "salary" | "additional" | null;
  payment_method: "card" | "cash" | "transfer" | null;
  amount: number;
  note: string | null;
  is_recurring: boolean;
  category: { name: string } | { name: string }[] | null;
}

function categoryName(category: ExportRow["category"]): string {
  if (!category) return "";
  return Array.isArray(category) ? (category[0]?.name ?? "") : category.name;
}

/** Builds the "Export all costs as CSV" file — actually every transaction (costs and income), matching the design's own reference implementation. */
export async function exportTransactionsCsv(): Promise<{ error: string } | { success: true; csv: string }> {
  const current = await getCurrentWorkspace();
  if (!current) return { error: "No workspace found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, occurred_on, merchant_or_source, income_kind, payment_method, amount, note, is_recurring, category:categories(name)")
    .eq("workspace_id", current.workspace.id)
    .order("occurred_on", { ascending: false });

  if (error) return { error: error.message };
  const rows = (data ?? []) as unknown as ExportRow[];

  const header = ["Type", "Date", "Merchant / source", "Category", "Payment", "Amount", "Notes", "Recurring"];
  const body = rows.map((t) => {
    const isIncome = t.type === "income";
    const category = isIncome
      ? t.income_kind === "salary"
        ? "Salary"
        : "Additional income"
      : categoryName(t.category);
    const amount = (isIncome ? t.amount : -t.amount).toFixed(2);
    return [
      t.type,
      t.occurred_on,
      t.merchant_or_source,
      category,
      isIncome ? "" : paymentLabel(t.payment_method),
      amount,
      t.note ?? "",
      t.is_recurring ? "yes" : "no",
    ];
  });

  const csv = [header, ...body].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  return { success: true, csv };
}
