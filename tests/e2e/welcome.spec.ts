import { expect, test } from "@playwright/test";

test.describe("Welcome page (signed out)", () => {
  test("shows the headline, hero image and sign-up form", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know where it went.");

    const hero = page.locator('img[src*="welcome-hero"]');
    await expect(hero).toBeVisible();
    // naturalWidth > 0 proves the file really loaded (a broken image has 0).
    await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    await expect(page.getByPlaceholder("Alex Morgan")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();
  });

  test("never scrolls sideways", async ({ page }) => {
    await page.goto("/welcome");
    await page.waitForLoadState("networkidle");
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("the social sign-in buttons are disabled for now", async ({ page }) => {
    await page.goto("/welcome");
    for (const name of ["Google", "Apple", "Microsoft", "GitHub"]) {
      await expect(page.getByRole("button", { name })).toBeDisabled();
    }
  });

  test("switching language to Bosnian translates the page and survives a reload", async ({ page }) => {
    await page.goto("/welcome");
    // Wait until the page has finished loading, then retry the click if the page
    // was not interactive yet (the dev server can be slow on a busy machine).
    await page.waitForLoadState("networkidle");
    const headline = page.getByRole("heading", { level: 1 });
    await expect(async () => {
      await page.getByText("Bosanski").click();
      await expect(headline).toHaveText("Znaj gdje je otišlo.", { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });

    await page.reload();
    await expect(headline).toHaveText("Znaj gdje je otišlo.");
  });
});

test.describe("Sign-up form validation (runs in the browser, no server calls)", () => {
  test("asks for a name first", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Name is required.")).toBeVisible();
  });

  // "user@domain" passes the browser's own email check but not Salda's (needs a dot),
  // so the message below is Salda's. Plain junk like "abc" is stopped by the browser first.
  test("rejects an invalid email", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByPlaceholder("Alex Morgan").fill("Test User");
    await page.getByPlaceholder("you@example.com").fill("user@domain");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });

  test("rejects a short password", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByPlaceholder("Alex Morgan").fill("Test User");
    await page.getByPlaceholder("you@example.com").fill("test@example.com");
    await page.getByPlaceholder("At least 8 characters").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  });

  test("sign-in mode hides the name field", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByText("Sign in", { exact: true }).first().click();
    await expect(page.getByPlaceholder("Alex Morgan")).toHaveCount(0);
  });
});
