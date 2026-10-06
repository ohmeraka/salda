import { format as dfFormat } from "date-fns";
import { bs as dfBs } from "date-fns/locale/bs";
import { enUS as dfEn } from "date-fns/locale/en-US";
import { bs, en, type MessageKey } from "./messages";

export type Locale = "en" | "bs";

export const LOCALES: Locale[] = ["en", "bs"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "salda_locale";

export type { MessageKey };

/** Keys of the form "x.y.one" give the base "x.y" used for plural lookups. */
type PluralOf<K> = K extends `${infer B}.one` ? B : never;
export type PluralBase = PluralOf<MessageKey>;

export type Params = Record<string, string | number>;

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "bs";
}

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, bs };

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
}

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  return interpolate(DICTIONARIES[locale][key] ?? en[key], params);
}

/** Picks the .one / .few / .other form for `n` using the language's own plural rules. */
export function translatePlural(locale: Locale, base: PluralBase, n: number, params?: Params): string {
  const category = new Intl.PluralRules(locale).select(n);
  const dict = DICTIONARIES[locale];
  const key = `${base}.${category}` as MessageKey;
  const fallback = `${base}.other` as MessageKey;
  return interpolate(dict[key] ?? dict[fallback], { n, ...params });
}

export type Translator = {
  locale: Locale;
  t: (key: MessageKey, params?: Params) => string;
  tn: (base: PluralBase, n: number, params?: Params) => string;
};

export function makeTranslator(locale: Locale): Translator {
  return {
    locale,
    t: (key, params) => translate(locale, key, params),
    tn: (base, n, params) => translatePlural(locale, base, n, params),
  };
}

/** Number/currency formatting locale for Intl. */
export function numberLocale(locale: Locale): string {
  return locale === "bs" ? "bs-BA" : "en-US";
}

/**
 * date-fns `format` in the chosen language. The first letter is capitalised
 * because the Bosnian locale returns lowercase day and month names
 * ("oktobar 2026") — fine mid-sentence, but these are used as labels.
 */
export function fmtDate(date: Date, pattern: string, locale: Locale): string {
  const out = dfFormat(date, pattern, { locale: locale === "bs" ? dfBs : dfEn });
  return out.charAt(0).toUpperCase() + out.slice(1);
}
