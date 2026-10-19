import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, categoryLabel } from "@/lib/i18n/categories";

const PAIRS: [en: string, bs: string][] = [
  ["Groceries", "Namirnice"],
  ["Utilities", "Režije"],
  ["Rent/Mortgage", "Stanarina/Kredit"],
  ["Transport", "Prijevoz"],
  ["Dining out", "Restorani"],
  ["Other", "Ostalo"],
];

describe("categoryLabel", () => {
  it.each(PAIRS)("translates %s to Bosnian (%s)", (en, bs) => {
    expect(categoryLabel(en, "bs")).toBe(bs);
  });

  it.each(PAIRS)("translates Bosnian %s back to English", (en, bs) => {
    expect(categoryLabel(bs, "en")).toBe(en);
  });

  it("keeps a category in its own language", () => {
    expect(categoryLabel("Groceries", "en")).toBe("Groceries");
    expect(categoryLabel("Namirnice", "bs")).toBe("Namirnice");
  });

  it("ignores case and surrounding spaces", () => {
    expect(categoryLabel("  groceries ", "bs")).toBe("Namirnice");
  });

  it("leaves custom categories exactly as typed", () => {
    expect(categoryLabel("Pets", "bs")).toBe("Pets");
    expect(categoryLabel("Kućni ljubimci", "en")).toBe("Kućni ljubimci");
  });

  it("starter lists match the expected six, in order", () => {
    expect(DEFAULT_CATEGORIES.en).toEqual(PAIRS.map(([en]) => en));
    expect(DEFAULT_CATEGORIES.bs).toEqual(PAIRS.map(([, bs]) => bs));
  });
});
