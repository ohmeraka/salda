import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { AUTH_FILE, expect, go, hasLogin, openAddSheet, test } from "./helpers";
import { APP_PAGES } from "./ux-pages";

// Accessibility (WCAG 2.1 A/AA) checks with axe-core. Fails on "serious" and "critical" problems,
// the ones that stop people from using the page (missing names, low contrast, broken structure).
async function serious(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal") // Next.js's dev-only overlay
    .analyze();
  return result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

function report(violations: Awaited<ReturnType<typeof serious>>) {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} element(s), e.g. ${v.nodes[0]?.target.join(" ")}\n  ${v.helpUrl}`
    )
    .join("\n");
}

test.describe("Accessibility @ux @a11y", () => {
  test("welcome page (English)", async ({ page }) => {
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    const v = await serious(page);
    expect(v, report(v)).toEqual([]);
  });

  test("welcome page (Bosnian)", async ({ page }) => {
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    await page.getByText("Bosanski").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Znaj gdje je otišlo.");
    const v = await serious(page);
    expect(v, report(v)).toEqual([]);
  });

  test("welcome page, sign-in mode", async ({ page }) => {
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    await page.getByText("Sign in", { exact: true }).first().click();
    const v = await serious(page);
    expect(v, report(v)).toEqual([]);
  });

  test.describe("signed in", () => {
    test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");
    test.use({ storageState: AUTH_FILE });

    for (const path of APP_PAGES) {
      test(`${path}`, async ({ app }) => {
        await go(app, path);
        await app.waitForLoadState("networkidle");
        const v = await serious(app);
        expect(v, report(v)).toEqual([]);
      });
    }

    test("the Add sheet (choose step and cost form)", async ({ app }) => {
      await openAddSheet(app);
      let v = await serious(app);
      expect(v, report(v)).toEqual([]);

      await app.getByRole("button", { name: /Enter manually/ }).click();
      v = await serious(app);
      expect(v, report(v)).toEqual([]);
    });
  });
});
