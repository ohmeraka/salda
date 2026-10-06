"use client";

import { createContext, useContext, useMemo } from "react";
import { makeTranslator, type Locale, type Translator } from "./index";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Translator for Client Components: `const { t, tn, locale } = useT();` */
export function useT(): Translator {
  const locale = useContext(LocaleContext);
  return useMemo(() => makeTranslator(locale), [locale]);
}
