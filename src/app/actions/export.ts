"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { incomeKindLabel, paymentLabel } from "@/lib/labels";
import { getT } from "@/lib/i18n/server";
import { categoryLabel } from "@/lib/i18n/categories";

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
  const { t, locale } = await getT();
  const current = await getCurrentWorkspace();
  if (!current) return { error: t("err.noWorkspace") };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("type, occurred_on, merchant_or_source, income_kind, payment_method, amount, note, is_recurring, category:categories(name)")
    .eq("workspace_id", current.workspace.id)
    .order("occurred_on", { ascending: false });

  if (error) return { error: error.message };
  const rows = (data ?? []) as unknown as ExportRow[];

  const header = [
    t("csv.type"),
    t("csv.date"),
    t("csv.merchant"),
    t("csv.category"),
    t("csv.payment"),
    t("csv.amount"),
    t("csv.notes"),
    t("csv.recurring"),
  ];
  const body = rows.map((row) => {
    const isIncome = row.type === "income";
    const category = isIncome ? incomeKindLabel(row.income_kind, t) : categoryLabel(categoryName(row.category), locale);
    const amount = (isIncome ? row.amount : -row.amount).toFixed(2);
    return [
      t(isIncome ? "csv.income" : "csv.cost"),
      row.occurred_on,
      row.merchant_or_source,
      category,
      isIncome ? "" : paymentLabel(row.payment_method, t),
      amount,
      row.note ?? "",
      t(row.is_recurring ? "csv.yes" : "csv.no"),
    ];
  });

  const csv = [header, ...body].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  return { success: true, csv };
}
