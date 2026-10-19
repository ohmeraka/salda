import { expect, test as base, type Page } from "@playwright/test";

/**
 * Shared helpers for the end-to-end tests.
 *
 * Signed-in tests need a TEST account on a DEV Supabase project:
 *   E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
 * Without them every signed-in test is skipped.
 */
export const email = process.env.E2E_EMAIL;
export const password = process.env.E2E_PASSWORD;
export const hasLogin = Boolean(email && password);

/** The session is saved here once (auth.setup.ts) and reused, so we don't sign in for every test. */
export const AUTH_FILE = "playwright/.auth/user.json";

/** In `next dev` a small "N" button can cover the phone's bottom bar. Real users never see it. */
export async function hideDevOverlay(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

/** page.goto + hide the dev overlay. Use for full page loads. */
export async function go(page: Page, path: string) {
  await page.goto(path);
  await hideDevOverlay(page);
}

/** "1.234 KM" / "$1,234" -> 1234. Only for whole-number figures (the Overview tiles). */
export function wholeNumber(text: string): number {
  return Number(text.replace(/[^\d]/g, ""));
}

/** Sign in through the real form (used by the sign-in tests and the one-time setup). */
export async function signInWithForm(page: Page) {
  await go(page, "/welcome");
  await page.getByText("Sign in", { exact: true }).first().click();
  await page.getByPlaceholder("you@example.com").fill(email!);
  await page.getByPlaceholder("At least 8 characters").fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/overview/, { timeout: 30_000 });
  await hideDevOverlay(page);
}

/** The "Spent" figure on the Overview card (whole numbers). Call while on /overview. */
export async function spentTotal(page: Page): Promise<number> {
  // Matches on the tile's own label, not hasText on the whole tile: the "Net" tile's
  // subtext ("Income − spent") also contains "spent" and would otherwise match too.
  const tile = page.locator(".ov-stat").filter({ has: page.locator(".kicker", { hasText: /^Spent$/ }) });
  return wholeNumber(await tile.locator(".ov-stat-num").innerText());
}

// ---------------------------------------------------------------- Add / edit sheet

export const sheet = (page: Page) => page.locator(".ed-sheet");
export const toast = (page: Page) => page.locator(".toast");

/** Opens the Add sheet from whichever navigation is visible (side bar on desktop, bottom bar on phone). */
export async function openAddSheet(page: Page) {
  await page.locator("nav").getByRole("button", { name: "Add", exact: true }).filter({ visible: true }).first().click();
  await expect(sheet(page).getByRole("heading", { name: "Add", exact: true })).toBeVisible();
}

export interface CostInput {
  merchant: string;
  amount: string;
  category?: string;
  note?: string;
}

/** Fills the cost form (sheet must already be on the form step). Does not save. */
export async function fillCostForm(page: Page, c: CostInput) {
  const s = sheet(page);
  await s.getByLabel("Amount", { exact: true }).fill(c.amount);
  await s.getByPlaceholder("Where did you spend?").fill(c.merchant);
  if (c.category) await s.getByRole("button", { name: c.category, exact: true }).click();
  if (c.note) await s.getByPlaceholder("Anything to remember").fill(c.note);
}

/** Add -> Enter manually -> fill -> Save cost, and wait for the confirmation. */
export async function addCost(page: Page, c: CostInput) {
  await openAddSheet(page);
  await page.getByRole("button", { name: /Enter manually/ }).click();
  await expect(sheet(page).getByRole("heading", { name: "New cost" })).toBeVisible();
  await fillCostForm(page, c);
  await sheet(page).getByRole("button", { name: "Save cost" }).click();
  await expect(toast(page)).toContainText(c.merchant);
  await expect(sheet(page)).toHaveCount(0);
}

export async function addIncome(page: Page, source: string, amount: string) {
  await openAddSheet(page);
  await page.getByRole("button", { name: /Add income/ }).click();
  await expect(sheet(page).getByRole("heading", { name: "New income" })).toBeVisible();
  await sheet(page).getByLabel("Amount", { exact: true }).fill(amount);
  await sheet(page).getByPlaceholder("Employer or client").fill(source);
  await sheet(page).getByRole("button", { name: "Save income" }).click();
  await expect(toast(page)).toContainText(source);
  await expect(sheet(page)).toHaveCount(0);
}

// ---------------------------------------------------------------- Activity page

export const searchBox = (page: Page) => page.getByPlaceholder("Search merchant, note or category");
export const entryRow = (page: Page, text: string) => page.locator(".row-btn", { hasText: text }).first();

/** Opens /activity and filters the list with the search box. No-ops if that redirects
 *  elsewhere (e.g. signed out) — lets the `tag` fixture's cleanup run safely even for a
 *  test that was skipped before signing in. */
export async function findInActivity(page: Page, text: string) {
  await go(page, "/activity");
  await page.waitForLoadState("networkidle");
  if (!page.url().includes("/activity")) return;
  await searchBox(page).fill(text);
}

/** With the edit sheet open: Delete -> confirm. */
export async function deleteOpenEntry(page: Page) {
  await sheet(page).getByRole("button", { name: "Delete", exact: true }).click();
  await page.locator(".dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
}

// ---------------------------------------------------------------- Settings page

/** The settings row (name + budget field + remove button) for a category. */
export const categoryRow = (page: Page, name: string) =>
  page
    .locator("div")
    .filter({ hasText: name })
    .filter({ has: page.getByRole("button", { name: "Remove category" }) })
    .last();

// ---------------------------------------------------------------- Cleanup

export async function purgeEntries(page: Page, tag: string) {
  await findInActivity(page, tag);
  for (let i = 0; i < 20; i++) {
    const row = entryRow(page, tag);
    try {
      await row.waitFor({ state: "visible", timeout: 2_000 });
    } catch {
      break;
    }
    await row.click();
    await deleteOpenEntry(page);
  }
}

export async function purgeCategories(page: Page, tag: string) {
  await go(page, "/settings");
  await page.waitForLoadState("networkidle");
  for (let i = 0; i < 10; i++) {
    const row = categoryRow(page, tag);
    if (!(await row.isVisible().catch(() => false))) break;
    const remove = row.getByRole("button", { name: "Remove category" });
    if (await remove.isDisabled()) break;
    await remove.click();
    await expect(toast(page)).toContainText("Category removed");
    await expect(row).toBeHidden();
  }
}

// ---------------------------------------------------------------- Test fixtures

type Fixtures = {
  /** A page that is already signed in (session reused from auth.setup.ts), on /overview. */
  app: Page;
  /** A unique prefix for everything this test creates. Anything carrying it is deleted afterwards. */
  tag: string;
};

export const test = base.extend<Fixtures>({
  app: async ({ page }, provide) => {
    await go(page, "/overview");
    if (!page.url().includes("/overview")) {
      // The shared storageState's session expired (it's captured once by auth.setup.ts
      // and reused for the whole run) — sign in fresh via the real form instead of failing.
      await signInWithForm(page);
    }
    await expect(page).toHaveURL(/\/overview/);
    await provide(page);
  },
  tag: async ({ page }, provide, testInfo) => {
    const tag = `E2E-${testInfo.project.name}-${Math.random().toString(36).slice(2, 8)}`;
    await provide(tag);
    // Best-effort cleanup so the dev database doesn't fill up with test data, even after a failure.
    try {
      await purgeEntries(page, tag);
      await purgeCategories(page, tag);
    } catch {
      /* ignore: cleanup must never hide the real test result */
    }
  },
});

export { expect };
