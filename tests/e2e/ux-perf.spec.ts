import { expect, go, test } from "./helpers";

// Loading speed. Only enforced in CI, where the app is a production build; a dev server is far slower.
test.describe("Performance @ux @perf", () => {
  test.skip(!process.env.CI, "Measured on the production build in CI only");

  test("welcome page: largest content shows within 4 seconds", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __lcp: number }).__lcp = 0;
      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) (window as unknown as { __lcp: number }).__lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    const lcp = await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp);
    expect(lcp, `LCP was ${Math.round(lcp)} ms`).toBeGreaterThan(0);
    expect(lcp, `LCP was ${Math.round(lcp)} ms`).toBeLessThan(4_000);
  });

  test("welcome page: the hero image is not larger than it needs to be", async ({ page }) => {
    const sizes: { url: string; bytes: number }[] = [];
    page.on("response", async (r) => {
      if (r.request().resourceType() === "image") {
        const len = Number(r.headers()["content-length"] ?? 0);
        sizes.push({ url: r.url(), bytes: len });
      }
    });
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    const big = sizes.filter((s) => s.bytes > 300_000);
    expect(big, `Images over 300 KB: ${JSON.stringify(big)}`).toEqual([]);
  });
});
