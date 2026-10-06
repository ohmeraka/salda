import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { fmtDate, type Locale } from "@/lib/i18n";

/** "yyyy-MM" — the month-selector value used across Overview/Activity/Summary. */
export function toMonthParam(date: Date) {
  return format(date, "yyyy-MM");
}

export function parseMonthParam(param: string | undefined): Date {
  if (!param) return new Date();
  const [y, m] = param.split("-").map(Number);
  if (!y || !m) return new Date();
  return new Date(y, m - 1, 1);
}

export function getMonthRange(monthDate: Date) {
  return { start: startOfMonth(monthDate), end: endOfMonth(monthDate) };
}

export function formatMonthLabel(monthDate: Date, locale: Locale = "en") {
  return fmtDate(monthDate, "MMMM yyyy", locale);
}

export function shiftMonth(monthDate: Date, direction: 1 | -1) {
  return direction === 1 ? addMonths(monthDate, 1) : subMonths(monthDate, 1);
}

export function toDateParam(date: Date) {
  return format(date, "yyyy-MM-dd");
}

/** Last N months ending at `monthDate`, oldest first — for the 6-month chart / summary ranges. */
export function lastNMonths(monthDate: Date, n: number): Date[] {
  return Array.from({ length: n }, (_, i) => subMonths(monthDate, n - 1 - i));
}

/**
 * Parses a "yyyy-MM-dd" (Postgres `date`) column value as a local calendar
 * date rather than UTC midnight — `new Date("2026-09-30")` shifts a day
 * earlier in any negative-UTC-offset timezone, which would mislabel the
 * date everywhere it's displayed.
 */
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
