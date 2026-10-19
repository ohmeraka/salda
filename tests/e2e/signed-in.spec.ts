import { expect, test } from "@playwright/test";

// Needs a TEST account on a DEV Supabase project:
//   E2E_EMAIL=test@example.com E2E_PASSWORD=... npm run test:e2e
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Signed in", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in tests");

  test("can sign in and reach every main page", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByText("Sign in", { exact: true }).first().click();
    await page.getByPlaceholder("you@example.com").fill(email!);
    await page.getByPlaceholder("At least 8 characters").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });
    await expect(page.getByText("Balance", { exact: true })).toBeVisible();

    // In `next dev` a small "N" button sits bottom-left and can cover the phone's
    // bottom navigation. It doesn't exist for real users, so hide it while testing.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    for (const [label, path] of [
      ["Activity", /\/activity/],
      ["Summary", /\/summary/],
      ["Settings", /\/settings/],
      ["Overview", /\/overview/],
    ] as const) {
      // Desktop and phone both render a nav; click whichever is visible.
      await page.getByRole("link", { name: label }).filter({ visible: true }).first().click();
      await expect(page).toHaveURL(path);
    }
  });

  test("signed-in visit to /welcome goes straight to the overview", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByText("Sign in", { exact: true }).first().click();
    await page.getByPlaceholder("you@example.com").fill(email!);
    await page.getByPlaceholder("At least 8 characters").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });

    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/overview/);
  });
});
