import type { Page } from "@playwright/test";
import { AUTH_FILE, expect, go, hasLogin, test } from "./helpers";
import { APP_PAGES, WIDTHS } from "./ux-pages";

// Layout and usability checks: no sideways scrolling, comfortable touch targets, no console errors,
// visible keyboard focus.

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function switchToBosnian(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.getByText("Bosanski").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "bs");
}

test.describe("Layout @ux @layout", () => {
  for (const width of WIDTHS) {
    test(`welcome page does not scroll sideways at ${width}px (English and Bosnian)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await go(page, "/welcome");
      await page.waitForLoadState("networkidle");
      expect(await overflow(page), "English").toBeLessThanOrEqual(0);

      // Bosnian words are often longer; that's where layouts break first.
      await switchToBosnian(page);
      expect(await overflow(page), "Bosnian").toBeLessThanOrEqual(0);
    });
  }

  test("welcome page has no layout shift while loading (CLS < 0.1)", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.1);
  });

  test.describe("signed in", () => {
    test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");
    test.use({ storageState: AUTH_FILE });

    for (const width of WIDTHS) {
      test(`app pages do not scroll sideways at ${width}px (English and Bosnian)`, async ({ app }) => {
        // Navigates every app page twice (English, then Bosnian) in one test; under load
        // from other tests running in parallel, that can brush against the default timeout.
        test.setTimeout(90_000);
        await app.setViewportSize({ width, height: 900 });
        const bad: string[] = [];
        for (const path of APP_PAGES) {
          await go(app, path);
          await app.waitForLoadState("networkidle");
          if ((await overflow(app)) > 0) bad.push(`${path} (English)`);
        }
        await go(app, "/settings");
        await switchToBosnian(app);
        for (const path of APP_PAGES) {
          await go(app, path);
          await app.waitForLoadState("networkidle");
          if ((await overflow(app)) > 0) bad.push(`${path} (Bosnian)`);
        }
        // Back to English for whatever runs next.
        await go(app, "/settings");
        await app.getByText("English", { exact: true }).click();
        expect(bad, `Pages that scroll sideways at ${width}px`).toEqual([]);
      });
    }
  });
});

test.describe("Touch targets @ux @touch", () => {
  // On a phone every button, link and field should be at least 44x44 CSS pixels.
  const MIN = 44;

  async function tooSmall(page: Page) {
    return page.evaluate((min) => {
      const out: string[] = [];
      const els = document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]");
      for (const el of Array.from(els)) {
        if (el.closest("nextjs-portal")) continue;
        const style = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (style.visibility === "hidden" || style.display === "none" || r.width === 0 || r.height === 0) continue;
        // Links inside a sentence are exempt (WCAG), like the "terms" link.
        if (el.tagName === "A" && el.closest("p")) continue;
        // Radio/checkbox: judge the whole label the person actually taps.
        if (el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox")) {
          const label = el.closest("label");
          if (label) {
            const lr = label.getBoundingClientRect();
            if (lr.height >= min && lr.width >= min) continue;
          }
        }
        if (r.height < min || r.width < min) {
          const name = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "")
            .trim()
            .slice(0, 30);
          out.push(`<${el.tagName.toLowerCase()}> "${name}" is ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return out;
    }, MIN);
  }

  test("welcome page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone", "Phone layout only");
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    const small = await tooSmall(page);
    expect(small, small.join("\n")).toEqual([]);
  });

  test.describe("signed in", () => {
    test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");
    test.use({ storageState: AUTH_FILE });

    for (const path of APP_PAGES) {
      test(`${path}`, async ({ app }, testInfo) => {
        test.skip(testInfo.project.name !== "phone", "Phone layout only");
        await go(app, path);
        await app.waitForLoadState("networkidle");
        const small = await tooSmall(app);
        expect(small, small.join("\n")).toEqual([]);
      });
    }
  });
});

test.describe("Health @ux @health", () => {
  /** Collects console errors, uncaught exceptions and failed requests to our own site. */
  function collectProblems(page: Page, baseURL: string) {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`exception: ${e.message}`));
    page.on("response", (r) => {
      if (r.status() >= 400 && r.url().startsWith(baseURL)) problems.push(`${r.status()} ${r.url()}`);
    });
    return problems;
  }

  test("welcome page loads without errors", async ({ page, baseURL }) => {
    const problems = collectProblems(page, baseURL!);
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    expect(problems).toEqual([]);
  });

  test.describe("signed in", () => {
    test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");
    test.use({ storageState: AUTH_FILE });

    for (const path of APP_PAGES) {
      test(`${path} loads without errors`, async ({ app, baseURL }) => {
        const problems = collectProblems(app, baseURL!);
        await go(app, path);
        await app.waitForLoadState("networkidle");
        expect(problems).toEqual([]);
      });
    }
  });
});

test.describe("Keyboard @ux @keyboard", () => {
  test("every control on the welcome page shows a visible focus indicator", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Keyboard test: desktop only");
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");

    const missing: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const hasRing = (n: Element) => {
          const s = getComputedStyle(n);
          const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
          const shadow = s.boxShadow !== "none";
          return outline || shadow;
        };
        // Styled radios/checkboxes may show the ring on their label or wrapper instead.
        const wrapper = el.closest("label, .seg-opt, .radio") ?? el;
        const name = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.tagName)
          .trim()
          .slice(0, 30);
        // Position in the document makes the id unique (several radios share the same name).
        const position = Array.from(document.querySelectorAll("*")).indexOf(el);
        return { id: `${position}:${el.tagName}:${name}`, ok: hasRing(el) || hasRing(wrapper) };
      });
      if (!info) continue;
      if (seen.has(info.id)) break; // wrapped around to the start
      seen.add(info.id);
      if (!info.ok) missing.push(info.id);
    }
    expect(seen.size, "should be able to Tab through the page").toBeGreaterThan(3);
    expect(missing, `No visible focus indicator on:\n${missing.join("\n")}`).toEqual([]);
  });
});
