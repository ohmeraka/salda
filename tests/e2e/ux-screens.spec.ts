import type { Page, TestInfo } from "@playwright/test";
import { AUTH_FILE, expect, go, hasLogin, openAddSheet, test } from "./helpers";
import { APP_PAGES } from "./ux-pages";

// Appearance review: takes a screenshot of every page, in English and Bosnian, on desktop and phone,
// and attaches them to the test report (and saves them in test-results/screens). Nothing is compared
// automatically: open the HTML report (npx playwright show-report) and look. This is how you spot
// cramped layouts, long words that break, and inconsistent spacing.
async function shot(page: Page, testInfo: TestInfo, name: string) {
  const file = `${name}-${testInfo.project.name}.png`;
  const body = await page.screenshot({ fullPage: true });
  await testInfo.attach(file, { body, contentType: "image/png" });
}

async function setLanguage(page: Page, label: "English" | "Bosanski") {
  await page.waitForLoadState("networkidle");
  await page.getByText(label, { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", label === "English" ? "en" : "bs");
}

test.describe("Screenshots @ux @screens", () => {
  test("welcome page (English, Bosnian, sign-in mode)", async ({ page }, testInfo) => {
    await go(page, "/welcome");
    await page.waitForLoadState("networkidle");
    await shot(page, testInfo, "welcome-en");
    await page.getByText("Sign in", { exact: true }).first().click();
    await shot(page, testInfo, "welcome-en-signin");
    await setLanguage(page, "Bosanski");
    await shot(page, testInfo, "welcome-bs-signin");
  });

  test.describe("signed in", () => {
    test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");
    test.use({ storageState: AUTH_FILE });

    for (const path of APP_PAGES) {
      test(`${path} (English and Bosnian)`, async ({ app }, testInfo) => {
        const slug = path.replace(/\//g, "-").replace(/^-/, "");
        await go(app, path);
        await app.waitForLoadState("networkidle");
        await shot(app, testInfo, `${slug}-en`);

        await go(app, "/settings");
        await setLanguage(app, "Bosanski");
        await go(app, path);
        await app.waitForLoadState("networkidle");
        await shot(app, testInfo, `${slug}-bs`);

        await go(app, "/settings");
        await setLanguage(app, "English");
      });
    }

    test("the Add sheet (choose step, cost form with errors)", async ({ app }, testInfo) => {
      await openAddSheet(app);
      await shot(app, testInfo, "add-choose");
      await app.getByRole("button", { name: /Enter manually/ }).click();
      await shot(app, testInfo, "add-cost-form");
      await app.locator(".ed-sheet").getByRole("button", { name: "Save cost" }).click();
      await shot(app, testInfo, "add-cost-errors");
    });
  });
});
