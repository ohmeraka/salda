import { describe, expect, it } from "vitest";
import { bs, en } from "@/lib/i18n/messages";
import { makeTranslator, translate, translatePlural } from "@/lib/i18n";

describe("messages", () => {
  it("has the same keys in English and Bosnian", () => {
    expect(Object.keys(bs).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty translations", () => {
    for (const [key, value] of Object.entries(bs)) {
      expect(value, `bs.${key}`).not.toBe("");
    }
  });

  it("uses the same {placeholders} in both languages", () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(bs[key]), key).toEqual(placeholders(en[key]));
    }
  });
});

describe("translate", () => {
  it("interpolates parameters", () => {
    const t = makeTranslator("en").t;
    expect(t("ov.overBy", { over: "10 KM", budget: "100 KM" })).toContain("10 KM");
  });

  it("picks Bosnian plural forms for 1, 2-4 and 5+", () => {
    const forms = [1, 2, 5].map((n) => translatePlural("bs", "act.costs", n));
    expect(new Set(forms).size).toBeGreaterThan(1);
  });

  it("translate() returns different text per language", () => {
    expect(translate("bs", "welcome.signIn")).not.toBe(translate("en", "welcome.signIn"));
  });
});
