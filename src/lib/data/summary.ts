import { subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/currency";
import { formatMonthLabel, lastNMonths, toDateParam, toMonthParam } from "@/lib/periods";
import { buildMonthBars, type MonthBar } from "@/lib/bars";
import { categoryRankColor } from "@/lib/palette";
import { fmtDate, type Translator } from "@/lib/i18n";
import { categoryLabel } from "@/lib/i18n/categories";
import type { Category, CurrencyCode, Transaction } from "@/types/database";

export type SummaryRange = "month" | "quarter" | "half";

export interface SummaryData {
  title: string;
  total: string;
  income: string;
  net: string;
  netColor: string;
  perDay: string;
  count: number;
  largest: string;
  largestWhere: string;
  hasDelta: boolean;
  deltaText: string;
  deltaClass: "tag-accent" | "tag-accent-2";
  hasBars: boolean;
  bars: MonthBar[];
  categoryShare: { name: string; amount: string; pct: string; widthPct: number; color: string }[];
  merchants: { name: string; count: number; amount: string }[];
}

const RANGE_MONTHS: Record<SummaryRange, number> = { month: 1, quarter: 3, half: 6 };

export async function getSummaryData(
  workspaceId: string,
  currency: CurrencyCode,
  range: SummaryRange,
  categories: Category[],
  { t, locale }: Translator
): Promise<SummaryData> {
  const supabase = await createClient();
  const today = new Date();
  const n = RANGE_MONTHS[range];

  // Fetch a 7-month window: enough for the widest range (6) plus one more
  // calendar month back, needed for the Month view's "vs last month" delta.
  const windowMonths = lastNMonths(today, 7);
  const rangeStart = windowMonths[0];
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("occurred_on", toDateParam(rangeStart))
    .lte("occurred_on", toDateParam(today))
    .order("occurred_on", { ascending: false });

  if (error) throw new Error(error.message);
  const all = (data ?? []) as Transaction[];
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const fmt = (v: number, decimals = 2) => formatCurrency(v, currency, decimals, locale);
  const sum = (rows: Transaction[]) => rows.reduce((total, t) => total + t.amount, 0);
  const inMonth = (monthKey: string, type?: Transaction["type"]) =>
    all.filter((t) => t.occurred_on.slice(0, 7) === monthKey && (!type || t.type === type));

  const rangeMonths = lastNMonths(today, n);
  const rangeKeys = new Set(rangeMonths.map((m) => toMonthParam(m)));
  const rangeCosts = all.filter((t) => t.type === "cost" && rangeKeys.has(t.occurred_on.slice(0, 7)));
  const rangeIncome = all.filter((t) => t.type === "income" && rangeKeys.has(t.occurred_on.slice(0, 7)));

  const totR = sum(rangeCosts);
  const incTotR = sum(rangeIncome);
  const netR = incTotR - totR;
  const days = Math.round((today.getTime() - rangeMonths[0].getTime()) / 86_400_000) + 1;

  const big = rangeCosts.slice().sort((a, b) => b.amount - a.amount)[0];

  const currentKey = toMonthParam(today);
  const prevKey = toMonthParam(subMonths(today, 1));
  const currentMonthTotal = sum(inMonth(currentKey, "cost"));
  const prevMonthTotal = sum(inMonth(prevKey, "cost"));
  const delta = currentMonthTotal - prevMonthTotal;

  // Month-by-month bars (3/6 month ranges only).
  const barVals = rangeMonths.map((m) => sum(inMonth(toMonthParam(m), "cost")));
  const bars = buildMonthBars(rangeMonths, barVals, (v) => fmt(v, 0), locale);

  // By category share — only categories with spend in range, ranked by amount.
  const byCategory = new Map<string, number>();
  for (const t of rangeCosts) {
    const key = t.category_id ?? "uncategorised";
    byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
  }
  const total = totR || 1;
  const rankedCategories = Array.from(byCategory.entries())
    .map(([id, v]) => ({ id, name: id === "uncategorised" ? t("common.uncategorised") : (categoryById.has(id) ? categoryLabel(categoryById.get(id)!.name, locale) : t("common.other")), v }))
    .sort((a, b) => b.v - a.v);
  const topCategoryAmount = rankedCategories[0]?.v || 1;
  const categoryShare = rankedCategories.map((c, i) => ({
    name: c.name,
    amount: fmt(c.v),
    pct: `${Math.round((c.v / total) * 100)}%`,
    widthPct: (c.v / topCategoryAmount) * 100,
    color: categoryRankColor(i),
  }));

  const merchantTotals = new Map<string, { name: string; v: number; n: number }>();
  for (const t of rangeCosts) {
    const existing = merchantTotals.get(t.merchant_or_source);
    if (existing) {
      existing.v += t.amount;
      existing.n += 1;
    } else {
      merchantTotals.set(t.merchant_or_source, { name: t.merchant_or_source, v: t.amount, n: 1 });
    }
  }
  const merchants = Array.from(merchantTotals.values())
    .sort((a, b) => b.v - a.v)
    .slice(0, 6)
    .map((m) => ({ name: m.name, count: m.n, amount: fmt(m.v) }));

  return {
    title: n === 1 ? formatMonthLabel(today, locale) : t(n === 3 ? "sum.lastQuarter" : "sum.lastHalf"),
    total: fmt(totR, 0),
    income: `+${fmt(incTotR, 0)}`,
    net: `${netR < 0 ? "−" : "+"}${fmt(Math.abs(netR), 0)}`,
    netColor: netR < 0 ? "var(--color-accent-2-700)" : "var(--color-accent-700)",
    perDay: fmt(totR / Math.max(days, 1)),
    count: rangeCosts.length,
    largest: big ? fmt(big.amount, 0) : "–",
    largestWhere: big ? big.merchant_or_source : "",
    hasDelta: n === 1,
    deltaText: t("sum.vs", {
      delta: `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta), 0)}`,
      month: fmtDate(subMonths(today, 1), "MMM", locale),
    }),
    deltaClass: delta > 0 ? "tag-accent-2" : "tag-accent",
    hasBars: n > 1,
    bars,
    categoryShare,
    merchants,
  };
}
