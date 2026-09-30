import { createClient } from "@/lib/supabase/server";
import { getMonthRange, toDateParam } from "@/lib/periods";
import { formatCurrency } from "@/lib/currency";
import { incomeKindLabel, paymentLabel } from "@/lib/labels";
import type { Category, CurrencyCode, Transaction, TransactionWithCategory } from "@/types/database";

export interface ActivityItem {
  tx: TransactionWithCategory;
  date: string; // occurred_on, "yyyy-MM-dd" — grouping key
  merchant: string;
  categoryLabel: string; // category name for a cost, income-kind label for income
  meta: string;
  amount: string; // pre-formatted, "+" prefixed for income
  isIncome: boolean;
  searchBlob: string; // lowercased merchant + note + category, for client-side search
}

/** All transactions in `workspaceId` for the calendar month containing `monthDate`. */
export async function getActivityMonth(
  workspaceId: string,
  monthDate: Date,
  currency: CurrencyCode,
  categories: Category[]
): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const { start, end } = getMonthRange(monthDate);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("occurred_on", toDateParam(start))
    .lte("occurred_on", toDateParam(end))
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Transaction[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return rows.map((t) => {
    const category = t.category_id ? categoryById.get(t.category_id) ?? null : null;
    const isIncome = t.type === "income";
    const categoryLabel = isIncome ? incomeKindLabel(t.income_kind) : category?.name ?? "Uncategorised";
    const fxLabel = t.fx_amount != null && t.fx_currency ? formatCurrency(t.fx_amount, t.fx_currency) : null;
    const metaParts = isIncome
      ? [categoryLabel, t.is_recurring ? "Monthly" : null, fxLabel]
      : [categoryLabel, paymentLabel(t.payment_method), t.is_recurring ? "Monthly" : null, fxLabel];

    const withCategory: TransactionWithCategory = {
      ...t,
      category: category ? { id: category.id, name: category.name } : null,
    };

    return {
      tx: withCategory,
      date: t.occurred_on,
      merchant: t.merchant_or_source,
      categoryLabel,
      meta: metaParts.filter(Boolean).join(" · "),
      amount: (isIncome ? "+" : "") + formatCurrency(t.amount, currency),
      isIncome,
      searchBlob: `${t.merchant_or_source} ${t.note ?? ""} ${categoryLabel}`.toLowerCase(),
    };
  });
}
