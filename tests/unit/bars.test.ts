import { describe, expect, it } from "vitest";
import { buildMonthBars } from "@/lib/bars";

const months = [new Date(2026, 6, 1), new Date(2026, 7, 1), new Date(2026, 8, 1)];

describe("buildMonthBars", () => {
  it("scales the tallest bar to 110px and marks only the last month as current", () => {
    const bars = buildMonthBars(months, [100, 50, 200], (n) => String(n));
    expect(bars.map((b) => b.heightPx)).toEqual([55, 27.5, 110]);
    expect(bars.map((b) => b.current)).toEqual([false, false, true]);
    expect(bars.map((b) => b.key)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("never draws a bar thinner than 4px, even for zero spend", () => {
    const bars = buildMonthBars(months, [0, 0, 0], (n) => String(n));
    expect(bars.every((b) => b.heightPx === 4)).toBe(true);
  });

  it("uses the formatter and the locale for labels", () => {
    const en = buildMonthBars(months, [1, 2, 3], (n) => `${n} KM`, "en");
    const bs = buildMonthBars(months, [1, 2, 3], (n) => `${n} KM`, "bs");
    expect(en[0].value).toBe("1 KM");
    expect(en[0].label).toBe("Jul");
    expect(bs[0].label.length).toBeGreaterThan(0);
  });
});
