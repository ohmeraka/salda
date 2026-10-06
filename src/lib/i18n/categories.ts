import type { Locale } from "./index";

/**
 * The starter categories every new account gets. The same position in each
 * list is the same category, which is how a stored name is translated for
 * display (see categoryLabel).
 */
export const DEFAULT_CATEGORIES: Record<Locale, string[]> = {
  en: ["Groceries", "Utilities", "Rent/Mortgage", "Transport", "Dining out", "Other"],
  bs: ["Namirnice", "Režije", "Stanarina/Kredit", "Prijevoz", "Restorani", "Ostalo"],
};

const norm = (s: string) => s.trim().toLowerCase();

// "groceries" -> 0, "namirnice" -> 0, "utilities" -> 1, ...
const DEFAULT_INDEX = new Map<string, number>();
for (const names of Object.values(DEFAULT_CATEGORIES)) {
  names.forEach((name, i) => DEFAULT_INDEX.set(norm(name), i));
}

/**
 * The name to show for a category in the chosen language. Category names are
 * stored exactly as created, so a starter category created while the app was
 * in English is still "Groceries" in the database. Starter names are mapped
 * to the current language here; categories you added yourself are shown as
 * you typed them.
 */
export function categoryLabel(name: string, locale: Locale): string {
  const i = DEFAULT_INDEX.get(norm(name));
  return i === undefined ? name : DEFAULT_CATEGORIES[locale][i];
}
