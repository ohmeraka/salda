import { describe, expect, it } from "vitest";
import {
  lastNMonths,
  parseDateOnly,
  parseMonthParam,
  shiftMonth,
  toDateParam,
  toMonthParam,
} from "@/lib/periods";

describe("periods", () => {
  it("parseDateOnly keeps the calendar day (no timezone shift)", () => {
    const d = parseDateOnly("2026-09-30");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 30]);
  });

  it("round-trips dates and months", () => {
    expect(toDateParam(parseDateOnly("2026-01-05"))).toBe("2026-01-05");
    expect(toMonthParam(new Date(2026, 9, 15))).toBe("2026-10");
  });

  it("parseMonthParam handles valid and invalid input", () => {
    expect(toMonthParam(parseMonthParam("2026-03"))).toBe("2026-03");
    const fallback = parseMonthParam("garbage");
    expect(Number.isNaN(fallback.getTime())).toBe(false);
    expect(Number.isNaN(parseMonthParam(undefined).getTime())).toBe(false);
  });

  it("shiftMonth moves across year boundaries", () => {
    expect(toMonthParam(shiftMonth(new Date(2026, 0, 15), -1))).toBe("2025-12");
    expect(toMonthParam(shiftMonth(new Date(2026, 11, 15), 1))).toBe("2027-01");
  });

  it("lastNMonths returns N months, oldest first, ending at the given month", () => {
    const months = lastNMonths(new Date(2026, 1, 10), 4).map(toMonthParam);
    expect(months).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});
