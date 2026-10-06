import { createClient } from "@/lib/supabase/server";
import { getMonthRange, toDateParam } from "@/lib/periods";
import { formatCurrency } from "@/lib/currency";
import { incomeKindLabel, paymentLabel } from "@/lib/labels";
import type { Translator } from "@/lib/i18n";
import { categoryLabel as localizedCategory } from "@/lib/i18n/categories";
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
  categories: Category[],
  { t, locale }: Translator
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

  return rows.map((row) => {
    const category = row.category_id ? categoryById.get(row.category_id) ?? null : null;
    const isIncome = row.type === "income";
    const categoryLabel = isIncome ? incomeKindLabel(row.income_kind, t) : category
        ? localizedCategory(category.name, locale)
        : t("common.uncategorised");
    const fxLabel =
      row.fx_amount != null && row.fx_currency ? formatCurrency(row.fx_amount, row.fx_currency, 2, locale) : null;
    const monthly = row.is_recurring ? t("common.monthly") : null;
    const metaParts = isIncome
      ? [categoryLabel, monthly, fxLabel]
      : [categoryLabel, paymentLabel(row.payment_method, t), monthly, fxLabel];

    const withCategory: TransactionWithCategory = {
      ...row,
      category: category ? { id: category.id, name: category.name } : null,
    };

    return {
      tx: withCategory,
      date: row.occurred_on,
      merchant: row.merchant_or_source,
      categoryLabel,
      meta: metaParts.filter(Boolean).join(" · "),
      amount: (isIncome ? "+" : "") + formatCurrency(row.amount, currency, 2, locale),
      isIncome,
      searchBlob: `${row.merchant_or_source} ${row.note ?? ""} ${categoryLabel}`.toLowerCase(),
    };
  });
}
