import { numberLocale, type Locale } from "@/lib/i18n";
import type { CurrencyCode } from "@/types/database";

export const CURRENCIES: CurrencyCode[] = ["BAM", "EUR", "USD", "GBP", "CHF"];

/** Amount-input prefix symbols, per the Salda design spec. */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BAM: "KM ",
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF ",
};

/**
 * BAM formats as "1.234,56 KM" (de-DE grouping + " KM" suffix, per the
 * Salda design spec) in both languages; everything else uses
 * Intl.NumberFormat in the chosen language ("bs-BA" / "en-US").
 * `decimals` defaults to 2; the design uses 0 (whole numbers) for large
 * summary figures (hero total, budget line, bar-chart values, category
 * rows) and 2 for line-item amounts (merchants, recent, upcoming).
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "BAM",
  decimals = 2,
  locale: Locale = "en"
): string {
  if (currency === "BAM") {
    const formatted = new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
    return `${formatted} KM`;
  }
  return new Intl.NumberFormat(numberLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatSigned(
  amount: number,
  currency: CurrencyCode = "BAM",
  decimals = 2,
  locale: Locale = "en"
): string {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}${formatCurrency(amount, currency, decimals, locale)}`;
}
