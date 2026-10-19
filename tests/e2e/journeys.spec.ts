import {
  AUTH_FILE,
  addCost,
  deleteOpenEntry,
  entryRow,
  expect,
  findInActivity,
  go,
  hasLogin,
  sheet,
  signInWithForm,
  spentTotal,
  test,
  toast,
} from "./helpers";

// User journeys: a realistic sequence of steps, start to finish, the way a person uses Salda.
test.describe("User journeys @journey", () => {
  test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");

  test.describe("from the sign-in form", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("daily routine: sign in, log a cost, watch the total move, recategorise, delete, sign out", async ({
      page,
      tag,
    }, testInfo) => {
      // Desktop only: this journey asserts on the Overview's account-wide "Spent" total,
      // which the desktop and phone projects would otherwise race on (same real account, run in parallel).
      test.skip(testInfo.project.name !== "desktop", "Avoids a cross-project race on the shared account's total; see helpers.ts");
      test.setTimeout(90_000);

      // 1. Sign in with the real form and land on the Overview.
      await signInWithForm(page);
      await expect(page.locator(".kicker", { hasText: "Balance" })).toBeVisible();
      const before = await spentTotal(page);

      // 2. Log a 100 cost. The "Spent" card on the Overview goes up by exactly 100.
      const merchant = `${tag} routine`;
      await addCost(page, { merchant, amount: "100", category: "Groceries" });
      // Longer poll window: other spec files run in parallel against this same real
      // account and briefly nudge the account-wide total while their own tagged entries
      // come and go.
      await expect.poll(() => spentTotal(page), { timeout: 30_000 }).toBe(before + 100);

      // 3. Find it in Activity and move it to another category.
      await findInActivity(page, tag);
      await expect(entryRow(page, merchant)).toContainText("Groceries");
      await entryRow(page, merchant).click();
      await sheet(page).getByRole("button", { name: "Transport", exact: true }).click();
      await sheet(page).getByRole("button", { name: "Save changes" }).click();
      await expect(toast(page)).toContainText("Saved");
      await expect(entryRow(page, merchant)).toContainText("Transport");

      // 4. The Summary page opens and shows the month's figures.
      await page.getByRole("link", { name: "Summary" }).filter({ visible: true }).first().click();
      await expect(page).toHaveURL(/\/summary/);
      await expect(page.locator(".kicker", { hasText: "Spent" }).first()).toBeVisible();

      // 5. Delete the cost; the Overview total returns to where it started.
      await findInActivity(page, tag);
      await entryRow(page, merchant).click();
      await deleteOpenEntry(page);
      await go(page, "/overview");
      await expect.poll(() => spentTotal(page), { timeout: 30_000 }).toBe(before);

      // 6. Sign out; protected pages are closed again.
      await go(page, "/settings");
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/welcome/);
      await page.goto("/overview");
      await expect(page).toHaveURL(/\/welcome/);
    });
  });

  test.describe("with a saved session", () => {
    test.use({ storageState: AUTH_FILE });

    test("Bosnian: switch language and the whole add-cost flow is translated", async ({ app }) => {
      await go(app, "/settings");
      await app.waitForLoadState("networkidle");
      await app.getByText("Bosanski").click();
      await expect(app.locator(".kicker", { hasText: "Postavke" })).toBeVisible();

      // Navigation is translated.
      await expect(app.getByRole("link", { name: "Pregled" }).filter({ visible: true }).first()).toBeVisible();
      await expect(app.getByRole("link", { name: "Aktivnost" }).filter({ visible: true }).first()).toBeVisible();

      // The add flow is translated, including the starter category names.
      await app.locator("nav").getByRole("button", { name: "Dodaj", exact: true }).filter({ visible: true }).first().click();
      await app.getByRole("button", { name: /Unesi ručno/ }).click();
      await expect(sheet(app).getByRole("heading", { name: "Novi trošak" })).toBeVisible();
      await expect(sheet(app).getByPlaceholder("Gdje je novac otišao?")).toBeVisible();
      await expect(sheet(app).getByRole("button", { name: "Namirnice", exact: true })).toBeVisible();
      await expect(sheet(app).getByRole("button", { name: "Spremi trošak" })).toBeVisible();

      // Closing works, and the language choice is remembered on the next page.
      await sheet(app).getByRole("button", { name: "Otkaži" }).click();
      await expect(sheet(app)).toHaveCount(0);
      await go(app, "/activity");
      await expect(app.getByRole("link", { name: "Pregled" }).filter({ visible: true }).first()).toBeVisible();

      // Back to English so nothing else is affected.
      await go(app, "/settings");
      await app.getByText("English", { exact: true }).click();
      await expect(app.locator(".kicker", { hasText: "Settings" })).toBeVisible();
    });

    test("month navigation: previous and next month on Activity", async ({ app }) => {
      await go(app, "/activity");
      const title = app.getByRole("heading", { level: 1 });
      const current = await title.innerText();

      // On the current month "next" is disabled; going back enables it.
      await app.getByRole("link", { name: "Previous month" }).click();
      await expect(title).not.toHaveText(current);

      await app.getByRole("link", { name: "Next month" }).click();
      await expect(title).toHaveText(current);
    });
  });
});
