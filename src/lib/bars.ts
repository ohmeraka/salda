import { format } from "date-fns";

export interface MonthBar {
  key: string;
  label: string;
  value: string;
  heightPx: number;
  current: boolean;
}

/** Shared "N months of spend" bar-chart shape used by Overview and Summary. */
export function buildMonthBars(monthKeys: Date[], valuesByMonth: number[], fmt: (n: number) => string): MonthBar[] {
  const max = Math.max(...valuesByMonth, 1);
  return monthKeys.map((m, i) => ({
    key: format(m, "yyyy-MM"),
    label: format(m, "MMM"),
    value: fmt(valuesByMonth[i]),
    heightPx: Math.max(4, (valuesByMonth[i] / max) * 110),
    current: i === monthKeys.length - 1,
  }));
}
