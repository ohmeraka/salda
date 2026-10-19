import {
  AUTH_FILE,
  addCost,
  categoryRow,
  expect,
  go,
  hasLogin,
  openAddSheet,
  sheet,
  test,
  toast,
} from "./helpers";

// Functional tests for categories & budgets (Settings page).
test.describe("Categories @functional", () => {
  test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");
  test.use({ storageState: AUTH_FILE });

  type Page = import("@playwright/test").Page;

  // The Add button next to the "New category" box (the navigation also has an "Add" button).
  const submitCategory = (page: Page, name: string) =>
    page.getByPlaceholder("New category").fill(name).then(() =>
      page.getByPlaceholder("New category").locator("xpath=..").getByRole("button", { name: "Add", exact: true }).click()
    );

  async function addCategory(page: Page, name: string) {
    await go(page, "/settings");
    await page.waitForLoadState("networkidle");
    await submitCategory(page, name);
    await expect(toast(page)).toContainText("Category added");
    await expect(categoryRow(page, name)).toBeVisible();
  }

  test("starter categories are listed in Settings and offered in the Add sheet", async ({ app }) => {
    await go(app, "/settings");
    for (const name of ["Groceries", "Transport", "Other"]) {
      await expect(app.getByText(name, { exact: true }).first()).toBeVisible();
    }

    await go(app, "/overview");
    await openAddSheet(app);
    await app.getByRole("button", { name: /Enter manually/ }).click();
    for (const name of ["Groceries", "Transport", "Other"]) {
      await expect(sheet(app).getByRole("button", { name, exact: true })).toBeVisible();
    }
  });

  test("a new category can be used for a cost; it is locked while used, removable once free", async ({ app, tag }) => {
    const name = `${tag}-cat`;
    await addCategory(app, name);

    // Unused: removable.
    await expect(categoryRow(app, name).getByRole("button", { name: "Remove category" })).toBeEnabled();

    // Use it for a cost.
    await go(app, "/overview");
    await addCost(app, { merchant: `${tag} thing`, amount: "9", category: name });

    // Used: the remove button is disabled.
    await go(app, "/settings");
    await expect(categoryRow(app, name).getByRole("button", { name: "Remove category" })).toBeDisabled();
    // (the afterEach cleanup deletes the cost first, then removes the now-unused category)
  });

  test("adding the same category twice shows an error", async ({ app, tag }) => {
    const name = `${tag}-dup`;
    await addCategory(app, name);

    await submitCategory(app, name);
    await expect(app.getByText("That category already exists.")).toBeVisible();
  });

  test("a category's monthly budget can be set and survives a reload", async ({ app, tag }) => {
    const name = `${tag}-budget`;
    await addCategory(app, name);

    const budget = categoryRow(app, name).getByLabel("Monthly budget");
    await budget.fill("500");
    await budget.blur();
    await expect(toast(app)).toContainText("Budget updated");

    await go(app, "/settings");
    await expect(categoryRow(app, name).getByLabel("Monthly budget")).toHaveValue("500");
  });
});
