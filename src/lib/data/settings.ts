import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/currency";
import { getMonthRange, toDateParam } from "@/lib/periods";
import type { Category, CurrencyCode } from "@/types/database";

export interface CategorySetting {
  id: string;
  name: string;
  budgetValue: number | null;
  spentLabel: string;
  locked: boolean;
}

export async function getCategorySettings(
  workspaceId: string,
  categories: Category[],
  currency: CurrencyCode
): Promise<CategorySetting[]> {
  const supabase = await createClient();
  const { start, end } = getMonthRange(new Date());

  const [{ data: monthRows }, { data: usedRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("workspace_id", workspaceId)
      .eq("type", "cost")
      .gte("occurred_on", toDateParam(start))
      .lte("occurred_on", toDateParam(end)),
    supabase.from("transactions").select("category_id").eq("workspace_id", workspaceId).not("category_id", "is", null),
  ]);

  const spendByCategory = new Map<string, number>();
  for (const row of monthRows ?? []) {
    if (row.category_id) spendByCategory.set(row.category_id, (spendByCategory.get(row.category_id) ?? 0) + row.amount);
  }
  const usedIds = new Set((usedRows ?? []).map((r) => r.category_id));

  const monthName = format(new Date(), "MMMM");
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    budgetValue: c.monthly_budget,
    spentLabel: `${formatCurrency(spendByCategory.get(c.id) ?? 0, currency)} spent in ${monthName}`,
    locked: usedIds.has(c.id),
  }));
}
