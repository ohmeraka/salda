"use server";

import { getT } from "@/lib/i18n/server";
import type { CurrencyCode } from "@/types/database";

type FxResult = { rate: number } | { error: string };

/**
 * Live exchange rate lookup via ExchangeRate-API (https://www.exchangerate-api.com).
 * Server-only — the API key must never reach the browser. Used to pre-fill
 * the Add/Edit sheet's manual rate field; the user can still type over it.
 */
export async function getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<FxResult> {
  if (from === to) return { rate: 1 };

  const { t } = await getT();

  const key = process.env.EXCHANGE_RATE_API_KEY;
  if (!key) return { error: t("err.fxNotConfigured") };

  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/${from}/${to}`, {
      next: { revalidate: 3600 }, // the API itself only refreshes once a day
    });
    if (!res.ok) return { error: t("err.fxFailed") };

    const data = (await res.json()) as { result: string; conversion_rate?: number; "error-type"?: string };
    if (data.result !== "success" || typeof data.conversion_rate !== "number") {
      return { error: t("err.fxFailed") };
    }
    return { rate: data.conversion_rate };
  } catch {
    return { error: t("err.fxFailed") };
  }
}
