import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeTranslator, type Locale, type Translator } from "./index";

/** The language chosen with the language switcher (cookie), English by default. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translator for Server Components and Server Actions. */
export async function getT(): Promise<Translator> {
  return makeTranslator(await getLocale());
}
