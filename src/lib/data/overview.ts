import { addMonths, endOfMonth, getDate, getDaysInMonth, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/currency";
import { lastNMonths, parseDateOnly, toDateParam, toMonthParam, formatMonthLabel } from "@/lib/periods";
import { paymentLabel } from "@/lib/labels";
import { buildMonthBars, type MonthBar } from "@/lib/bars";
import { fmtDate, type Translator } from "@/lib/i18n";
import { categoryLabel } from "@/lib/i18n/categories";
import type { Category, CurrencyCode, Transaction } from "@/types/database";

export interface OverviewData {
  monthLabel: string;
  spent: string;
  hasBudget: boolean;
  budgetBarPct: number;
  budgetBarColor: string;
  budgetLine: string;
  deltaText: string;
  deltaClass: "tag-accent" | "tag-accent-2";
  income: string;
  net: string;
  netColor: string;
  balance: string;
  balanceColor: string;
  sixMonthBars: MonthBar[];
  categoryRows: { id: string; name: string; amountLabel: string; widthPct: number; color: string }[];
  topMerchants: { name: string; count: number; amount: string }[];
  nextMonthLabel: string;
  upcomingTotal: string;
  upcoming: { key: string; when: string; label: string; amount: string; isIncome: boolean }[];
  recent: { tx: Transaction; categoryName: string | null; meta: string; amount: string }[];
}

const POSITIVE = "var(--color-accent-700)";
const NEGATIVE = "var(--color-accent-2-700)";
const BALANCE_POSITIVE = "var(--color-positive)";
const BALANCE_NEGATIVE = "var(--color-negative)";

/**
 * Income minus costs across every entry dated up to today. Read in pages of
 * 1000 because the API caps a single response at 1000 rows — a plain
 * select would silently under-count a busy workspace.
 */
async function getAllTimeBalance(workspaceId: string): Promise<number> {
  const supabase = await createClient();
  const pageSize = 1000;
  const today = toDateParam(new Date());
  let from = 0;
  let balance = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("workspace_id", workspaceId)
      .lte("occurred_on", today)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) balance += row.type === "income" ? row.amount : -row.amount;
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return Math.round(balance * 100) / 100;
}

export async function getOverviewData(
  workspaceId: string,
  budget: number | null,
  currency: CurrencyCode,
  categories: Category[],
  { t, locale }: Translator
): Promise<OverviewData> {
  const supabase = await createClient();
  const today = new Date();
  const monthKeys = lastNMonths(today, 6); // oldest first, last entry = current month
  const rangeStart = startOfMonth(monthKeys[0]);
  const rangeEnd = endOfMonth(today);

  const [{ data, error }, balanceTotal] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("occurred_on", toDateParam(rangeStart))
      .lte("occurred_on", toDateParam(rangeEnd))
      .order("occurred_on", { ascending: false }),
    getAllTimeBalance(workspaceId),
  ]);

  if (error) throw new Error(error.message);
  const all = (data ?? []) as Transaction[];

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const fmt = (n: number, decimals = 2) => formatCurrency(n, currency, decimals, locale);
  const signed = (n: number) => `${n < 0 ? "−" : "+"}${fmt(Math.abs(n), 0)}`;

  const inMonth = (monthKey: string, type?: Transaction["type"]) =>
    all.filter((t) => t.occurred_on.slice(0, 7) === monthKey && (!type || t.type === type));

  const sum = (rows: Transaction[]) => rows.reduce((total, t) => total + t.amount, 0);

  const currentKey = toMonthParam(today);
  const prevKey = toMonthParam(monthKeys[monthKeys.length - 2] ?? addMonths(today, -1));

  const curCosts = inMonth(currentKey, "cost");
  const prevCosts = inMonth(prevKey, "cost");
  const curIncome = inMonth(currentKey, "income");

  const tot = sum(curCosts);
  const prevTot = sum(prevCosts);
  const incTot = sum(curIncome);
  const netTot = incTot - tot;
  const delta = tot - prevTot;

  const hasBudget = budget != null && budget > 0;
  const pctB = hasBudget ? tot / budget : 0;
  const left = hasBudget ? budget - tot : 0;

  // Last six months bar chart.
  const sixVals = monthKeys.map((m) => sum(inMonth(toMonthParam(m), "cost")));
  const sixMonthBars = buildMonthBars(monthKeys, sixVals, (n) => fmt(n, 0), locale);

  // By category (spend vs each category's own monthly budget).
  const categoryRows = categories
    .map((c) => {
      const v = sum(curCosts.filter((t) => t.category_id === c.id));
      const r = c.monthly_budget ? v / c.monthly_budget : 0;
      return {
        id: c.id,
        name: categoryLabel(c.name, locale),
        amountLabel: c.monthly_budget
          ? t("ov.of", { spent: fmt(v, 0), budget: fmt(c.monthly_budget, 0) })
          : fmt(v, 0),
        widthPct: Math.min(100, r * 100),
        color: r >= 1 ? "var(--color-accent-2)" : r >= 0.85 ? "var(--color-accent-2-400)" : "var(--color-accent)",
        sortVal: v,
      };
    })
    .sort((a, b) => b.sortVal - a.sortVal);

  // Top merchants.
  const merchantTotals = new Map<string, { name: string; v: number; n: number }>();
  for (const tx of curCosts) {
    const existing = merchantTotals.get(tx.merchant_or_source);
    if (existing) {
      existing.v += tx.amount;
      existing.n += 1;
    } else {
      merchantTotals.set(tx.merchant_or_source, { name: tx.merchant_or_source, v: tx.amount, n: 1 });
    }
  }
  const topMerchants = Array.from(merchantTotals.values())
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((m) => ({ name: m.name, count: m.n, amount: fmt(m.v) }));

  // Coming up next month — recurring entries from this month, projected onto next month's calendar.
  const nextMonthDate = addMonths(today, 1);
  const nextMonthLabel = fmtDate(nextMonthDate, "MMMM", locale);
  const daysInNextMonth = getDaysInMonth(nextMonthDate);
  const recurringCosts = curCosts.filter((tx) => tx.is_recurring);
  const recurringIncome = curIncome.filter((tx) => tx.is_recurring);

  const upcoming = [
    ...recurringCosts.map((tx) => ({
      day: Math.min(getDate(parseDateOnly(tx.occurred_on)), daysInNextMonth),
      label: tx.merchant_or_source,
      amount: fmt(tx.amount),
      isIncome: false,
    })),
    ...recurringIncome.map((tx) => ({
      day: Math.min(getDate(parseDateOnly(tx.occurred_on)), daysInNextMonth),
      label: tx.merchant_or_source,
      amount: "+" + fmt(tx.amount),
      isIncome: true,
    })),
  ]
    .sort((a, b) => a.day - b.day)
    .map((u, i) => ({
      key: `${u.day}-${i}`,
      when: `${u.day} ${fmtDate(nextMonthDate, "MMM", locale)}`,
      label: u.label,
      amount: u.amount,
      isIncome: u.isIncome,
    }));

  // Recent — 5 latest costs.
  const recent = curCosts
    .slice()
    .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : a.id < b.id ? 1 : -1))
    .slice(0, 5)
    .map((tx) => {
      const category = tx.category_id ? categoryById.get(tx.category_id) : undefined;
      const metaParts = [
        category ? categoryLabel(category.name, locale) : undefined,
        paymentLabel(tx.payment_method, t),
        tx.is_recurring ? t("common.monthly") : null,
        tx.fx_amount != null && tx.fx_currency ? formatCurrency(tx.fx_amount, tx.fx_currency, 2, locale) : null,
      ].filter(Boolean);
      return {
        tx,
        categoryName: category?.name ?? null,
        meta: `${fmtDate(parseDateOnly(tx.occurred_on), "EEE, d MMM", locale)} · ${metaParts.join(" · ")}`,
        amount: fmt(tx.amount),
      };
    });

  const prevMonthDate = monthKeys[monthKeys.length - 2] ?? addMonths(today, -1);

  return {
    monthLabel: formatMonthLabel(today, locale),
    spent: fmt(tot, 0),
    hasBudget,
    budgetBarPct: Math.min(100, pctB * 100),
    budgetBarColor: pctB >= 0.9 ? "var(--color-accent-2)" : "var(--color-accent)",
    budgetLine: hasBudget
      ? left >= 0
        ? t("ov.leftOf", { left: fmt(left, 0), budget: fmt(budget!, 0) })
        : t("ov.overBy", { over: fmt(-left, 0), budget: fmt(budget!, 0) })
      : t("ov.noBudget"),
    deltaText: t("ov.vs", {
      delta: `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta), 0)}`,
      month: fmtDate(prevMonthDate, "MMM", locale),
    }),
    deltaClass: delta > 0 ? "tag-accent-2" : "tag-accent",
    income: `+${fmt(incTot, 0)}`,
    net: signed(netTot),
    netColor: netTot < 0 ? NEGATIVE : POSITIVE,
    balance: signed(balanceTotal),
    balanceColor: balanceTotal < 0 ? BALANCE_NEGATIVE : BALANCE_POSITIVE,
    sixMonthBars,
    categoryRows,
    topMerchants,
    nextMonthLabel,
    upcomingTotal: fmt(sum(recurringCosts), 0),
    upcoming,
    recent,
  };
}
