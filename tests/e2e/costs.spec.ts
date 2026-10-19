import {
  AUTH_FILE,
  addCost,
  addIncome,
  deleteOpenEntry,
  entryRow,
  expect,
  fillCostForm,
  findInActivity,
  hasLogin,
  openAddSheet,
  searchBox,
  sheet,
  test,
  toast,
} from "./helpers";

// Functional tests: adding, editing, categorising and deleting costs and income.
// Needs E2E_EMAIL / E2E_PASSWORD (a test account on a DEV project). Assumes the starter
// categories (Groceries, Transport, ...) still exist for that account.
test.describe("Costs and income @functional", () => {
  test.skip(!hasLogin, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");
  test.use({ storageState: AUTH_FILE });

  test("add a cost: it appears in Activity with its amount and category", async ({ app, tag }) => {
    const merchant = `${tag} shop`;
    await addCost(app, { merchant, amount: "12.34", category: "Groceries" });

    await findInActivity(app, tag);
    const row = entryRow(app, merchant);
    await expect(row).toBeVisible();
    await expect(row).toContainText("12,34");
    await expect(row).toContainText("Groceries");
  });

  test("saving an empty form shows clear errors and keeps the sheet open", async ({ app }) => {
    await openAddSheet(app);
    await app.getByRole("button", { name: /Enter manually/ }).click();
    await sheet(app).getByRole("button", { name: "Save cost" }).click();

    await expect(sheet(app).getByText("Enter an amount above 0")).toBeVisible();
    await expect(sheet(app).getByText("Add a merchant or short description")).toBeVisible();
    await expect(sheet(app)).toBeVisible();

    // A zero amount is still rejected.
    await sheet(app).getByLabel("Amount", { exact: true }).fill("0");
    await sheet(app).getByPlaceholder("Where did you spend?").fill("Anything");
    await sheet(app).getByRole("button", { name: "Save cost" }).click();
    await expect(sheet(app).getByText("Enter an amount above 0")).toBeVisible();
  });

  test("Cancel closes the sheet and saves nothing", async ({ app, tag }) => {
    await openAddSheet(app);
    await app.getByRole("button", { name: /Enter manually/ }).click();
    await fillCostForm(app, { merchant: `${tag} cancelled`, amount: "5" });
    await sheet(app).getByRole("button", { name: "Cancel" }).click();
    await expect(sheet(app)).toHaveCount(0);

    await findInActivity(app, tag);
    await expect(entryRow(app, tag)).toHaveCount(0);
  });

  test("change the category of an existing cost, then filter by it", async ({ app, tag }) => {
    const merchant = `${tag} fuel`;
    await addCost(app, { merchant, amount: "40", category: "Groceries" });

    await findInActivity(app, tag);
    await entryRow(app, merchant).click();
    await expect(sheet(app).getByRole("heading", { name: "Edit cost" })).toBeVisible();
    await sheet(app).getByRole("button", { name: "Transport", exact: true }).click();
    await sheet(app).getByRole("button", { name: "Save changes" }).click();
    await expect(toast(app)).toContainText("Saved");
    await expect(sheet(app)).toHaveCount(0);

    // The row now shows the new category...
    await expect(entryRow(app, merchant)).toContainText("Transport");
    await expect(entryRow(app, merchant)).not.toContainText("Groceries");

    // ...and the category chips filter correctly.
    await app.getByRole("button", { name: "Transport", exact: true }).click();
    await expect(entryRow(app, merchant)).toBeVisible();
    await app.getByRole("button", { name: "Groceries", exact: true }).click();
    await expect(entryRow(app, merchant)).toHaveCount(0);
    await app.getByRole("button", { name: "All", exact: true }).click();
    await expect(entryRow(app, merchant)).toBeVisible();
  });

  test("edit the amount and merchant of a cost", async ({ app, tag }) => {
    await addCost(app, { merchant: `${tag} before`, amount: "10", category: "Other" });

    await findInActivity(app, tag);
    await entryRow(app, `${tag} before`).click();
    await sheet(app).getByLabel("Amount", { exact: true }).fill("25.50");
    await sheet(app).getByPlaceholder("Where did you spend?").fill(`${tag} after`);
    await sheet(app).getByRole("button", { name: "Save changes" }).click();
    await expect(toast(app)).toContainText(`${tag} after`);

    await expect(entryRow(app, `${tag} after`)).toContainText("25,50");
    await expect(entryRow(app, `${tag} before`)).toHaveCount(0);
  });

  test("delete asks for confirmation: Keep cancels, Delete removes", async ({ app, tag }) => {
    const merchant = `${tag} delete me`;
    await addCost(app, { merchant, amount: "7", category: "Other" });

    await findInActivity(app, tag);
    await entryRow(app, merchant).click();
    await sheet(app).getByRole("button", { name: "Delete", exact: true }).click();
    await expect(app.locator(".dialog")).toContainText("Delete this entry?");

    await app.locator(".dialog").getByRole("button", { name: "Keep" }).click();
    await expect(app.locator(".dialog")).toHaveCount(0);
    await expect(sheet(app)).toBeVisible(); // still editing, nothing deleted

    await deleteOpenEntry(app);
    await expect(toast(app)).toContainText("Entry deleted");
    await expect(entryRow(app, merchant)).toHaveCount(0);
  });

  test("add income: it shows with a plus sign and under the Income filter", async ({ app, tag }) => {
    const source = `${tag} employer`;
    await addIncome(app, source, "50");

    await findInActivity(app, tag);
    const row = entryRow(app, source);
    await expect(row).toContainText("+50,00");

    await app.getByRole("button", { name: "Income", exact: true }).click();
    await expect(row).toBeVisible();
  });

  test("search finds entries by merchant and by note, and explains an empty result", async ({ app, tag }) => {
    const a = `${tag} alpha`;
    const b = `${tag} beta`;
    await addCost(app, { merchant: a, amount: "3", category: "Transport", note: "needle-note" });
    await addCost(app, { merchant: b, amount: "4", category: "Groceries" });

    await findInActivity(app, tag);
    await expect(entryRow(app, a)).toBeVisible();
    await expect(entryRow(app, b)).toBeVisible();

    // By note
    await searchBox(app).fill("needle-note");
    await expect(entryRow(app, a)).toBeVisible();
    await expect(entryRow(app, b)).toHaveCount(0);

    // By merchant
    await searchBox(app).fill(`${tag} beta`);
    await expect(entryRow(app, b)).toBeVisible();
    await expect(entryRow(app, a)).toHaveCount(0);

    // Nothing matches -> friendly message
    await searchBox(app).fill(`${tag} zzz-nothing`);
    await expect(app.getByText("Nothing matches.")).toBeVisible();
  });
});
