import { expect, test } from "@playwright/test";

// A signed-out visitor must never see app pages.
for (const path of ["/overview", "/activity", "/summary", "/settings"]) {
  test(`signed-out visit to ${path} redirects to /welcome`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/welcome$/);
  });
}

test("PWA manifest and icons are served", async ({ request }) => {
  const manifest = await request.get("/manifest.json");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).name).toBeTruthy();
  for (const icon of ["/icons/icon-192.png", "/icons/icon-512.png"]) {
    expect((await request.get(icon)).ok(), icon).toBe(true);
  }
});
