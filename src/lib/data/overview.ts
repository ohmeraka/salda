import { addMonths, endOfMonth, format, getDate, getDaysInMonth, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/currency";
import { lastNMonths, parseDateOnly, toDateParam, toMonthParam, formatMonthLabel } from "@/lib/periods";
import { paymentLabel } from "@/lib/labels";
import { buildMonthBars, type MonthBar } from "@/lib/bars";
import type { Category, CurrencyCode, Transaction } from "@/types/database";

export interface OverviewData {
  monthLabel: string;
  spentWhole: string;
  hasBudget: boolean;
  budgetBarPct: number;
  budgetBarColor: string;
  budgetLine: string;
  deltaText: string;
  deltaClass: "tag-accent" | "tag-accent-2";
  income: string;
  net: string;
  netColor: string;
  sixMonthBars: MonthBar[];
  categoryRows: { id: string; name: string; amountLabel: string; widthPct: number; color: string }[];
  topMerchants: { name: string; count: number; amount: string }[];
  nextMonthLabel: string;
  upcomingTotal: string;
  upcoming: { key: string; when: string; label: string; amount: string; isIncome: boolean }[];
  recent: { tx: Transaction; categoryName: string | null; meta: string; amount: string }[];
}

export async function getOverviewData(
  workspaceId: string,
  budget: number | null,
  currency: CurrencyCode,
  categories: Category[]
): Promise<OverviewData> {
  const supabase = await createClient();
  const today = new Date();
  const monthKeys = lastNMonths(today, 6); // oldest first, last entry = current month
  const rangeStart = startOfMonth(monthKeys[0]);
  const rangeEnd = endOfMonth(today);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("occurred_on", toDateParam(rangeStart))
    .lte("occurred_on", toDateParam(rangeEnd))
    .order("occurred_on", { ascending: false });

  if (error) throw new Error(error.message);
  const all = (data ?? []) as Transaction[];

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const fmt = (n: number, decimals = 2) => formatCurrency(n, currency, decimals);

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
  const sixMonthBars = buildMonthBars(monthKeys, sixVals, (n) => fmt(n, 0));

  // By category (spend vs each category's own monthly budget).
  const categoryRows = categories
    .map((c) => {
      const v = sum(curCosts.filter((t) => t.category_id === c.id));
      const r = c.monthly_budget ? v / c.monthly_budget : 0;
      return {
        id: c.id,
        name: c.name,
        amountLabel: fmt(v, 0) + (c.monthly_budget ? " of " + fmt(c.monthly_budget, 0) : ""),
        widthPct: Math.min(100, r * 100),
        color: r >= 1 ? "var(--color-accent-2)" : r >= 0.85 ? "var(--color-accent-2-400)" : "var(--color-accent)",
        sortVal: v,
      };
    })
    .sort((a, b) => b.sortVal - a.sortVal);

  // Top merchants.
  const merchantTotals = new Map<string, { name: string; v: number; n: number }>();
  for (const t of curCosts) {
    const existing = merchantTotals.get(t.merchant_or_source);
    if (existing) {
      existing.v += t.amount;
      existing.n += 1;
    } else {
      merchantTotals.set(t.merchant_or_source, { name: t.merchant_or_source, v: t.amount, n: 1 });
    }
  }
  const topMerchants = Array.from(merchantTotals.values())
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((m) => ({ name: m.name, count: m.n, amount: fmt(m.v) }));

  // Coming up next month — recurring entries from this month, projected onto next month's calendar.
  const nextMonthDate = addMonths(today, 1);
  const nextMonthLabel = format(nextMonthDate, "MMMM");
  const daysInNextMonth = getDaysInMonth(nextMonthDate);
  const recurringCosts = curCosts.filter((t) => t.is_recurring);
  const recurringIncome = curIncome.filter((t) => t.is_recurring);

  const upcoming = [
    ...recurringCosts.map((t) => ({
      day: Math.min(getDate(parseDateOnly(t.occurred_on)), daysInNextMonth),
      label: t.merchant_or_source,
      amount: fmt(t.amount),
      isIncome: false,
    })),
    ...recurringIncome.map((t) => ({
      day: Math.min(getDate(parseDateOnly(t.occurred_on)), daysInNextMonth),
      label: t.merchant_or_source,
      amount: "+" + fmt(t.amount),
      isIncome: true,
    })),
  ]
    .sort((a, b) => a.day - b.day)
    .map((u, i) => ({
      key: `${u.day}-${i}`,
      when: `${u.day} ${format(nextMonthDate, "MMM")}`,
      label: u.label,
      amount: u.amount,
      isIncome: u.isIncome,
    }));

  // Recent — 5 latest costs.
  const recent = curCosts
    .slice()
    .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : (a.id < b.id ? 1 : -1)))
    .slice(0, 5)
    .map((t) => {
      const category = t.category_id ? categoryById.get(t.category_id) : undefined;
      const metaParts = [
        category?.name,
        paymentLabel(t.payment_method),
        t.is_recurring ? "Monthly" : null,
        t.fx_amount != null && t.fx_currency ? formatCurrency(t.fx_amount, t.fx_currency) : null,
      ].filter(Boolean);
      return {
        tx: t,
        categoryName: category?.name ?? null,
        meta: `${format(parseDateOnly(t.occurred_on), "EEE, d MMM")} · ${metaParts.join(" · ")}`,
        amount: fmt(t.amount),
      };
    });

  return {
    monthLabel: formatMonthLabel(today),
    spentWhole: fmt(tot, 0),
    hasBudget,
    budgetBarPct: Math.min(100, pctB * 100),
    budgetBarColor: pctB >= 0.9 ? "var(--color-accent-2)" : "var(--color-accent)",
    budgetLine: hasBudget
      ? left >= 0
        ? `${fmt(left, 0)} left of ${fmt(budget!, 0)}`
        : `${fmt(-left, 0)} over ${fmt(budget!, 0)}`
      : "No monthly budget set yet",
    deltaText: `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta), 0)} vs ${format(monthKeys[monthKeys.length - 2] ?? addMonths(today, -1), "MMM")}`,
    deltaClass: delta > 0 ? "tag-accent-2" : "tag-accent",
    income: `+${fmt(incTot, 0)}`,
    net: `${netTot < 0 ? "−" : "+"}${fmt(Math.abs(netTot), 0)}`,
    netColor: netTot < 0 ? "var(--color-accent-2-700)" : "var(--color-accent-700)",
    sixMonthBars,
    categoryRows,
    topMerchants,
    nextMonthLabel,
    upcomingTotal: fmt(sum(recurringCosts), 0),
    upcoming,
    recent,
  };
}
