import { describe, expect, it } from "vitest";
import { formatCurrency, formatSigned } from "@/lib/currency";

describe("formatCurrency", () => {
  it("formats BAM with de-DE grouping and a KM suffix in both languages", () => {
    expect(formatCurrency(1234.5, "BAM", 2, "en")).toBe("1.234,50 KM");
    expect(formatCurrency(1234.5, "BAM", 2, "bs")).toBe("1.234,50 KM");
  });

  it("respects the number of decimals", () => {
    expect(formatCurrency(1234.56, "BAM", 0)).toBe("1.235 KM");
    expect(formatCurrency(5, "BAM", 2)).toBe("5,00 KM");
  });

  it("formats other currencies with Intl", () => {
    expect(formatCurrency(1234.5, "USD", 2, "en")).toBe("$1,234.50");
    expect(formatCurrency(10, "EUR", 2, "en")).toContain("10.00");
  });
});

describe("formatSigned", () => {
  it("adds a plus sign to positive and zero amounts only", () => {
    expect(formatSigned(10, "BAM")).toBe("+10,00 KM");
    expect(formatSigned(0, "BAM")).toBe("+0,00 KM");
    expect(formatSigned(-10, "BAM")).toBe("-10,00 KM");
  });
});
