import { format } from "date-fns";
import { fmtDate, type Locale } from "@/lib/i18n";

export interface MonthBar {
  key: string;
  label: string;
  value: string;
  heightPx: number;
  current: boolean;
}

/** Shared "N months of spend" bar-chart shape used by Overview and Summary. */
export function buildMonthBars(
  monthKeys: Date[],
  valuesByMonth: number[],
  fmt: (n: number) => string,
  locale: Locale = "en"
): MonthBar[] {
  const max = Math.max(...valuesByMonth, 1);
  return monthKeys.map((m, i) => ({
    key: format(m, "yyyy-MM"),
    label: fmtDate(m, "MMM", locale),
    value: fmt(valuesByMonth[i]),
    heightPx: Math.max(4, (valuesByMonth[i] / max) * 110),
    current: i === monthKeys.length - 1,
  }));
}
