import { test as setup } from "@playwright/test";
import { AUTH_FILE, hasLogin, purgeCategories, purgeEntries, signInWithForm } from "./helpers";

// Signs in once and saves the session; the signed-in suites reuse it.
// (Supabase limits how often one address may sign in, so we don't sign in per test.)
setup("sign in once and save the session", async ({ page }) => {
  if (!hasLogin) return; // signed-in suites skip themselves
  await signInWithForm(page);
  await page.context().storageState({ path: AUTH_FILE });

  // Sweep up test data left behind by an earlier run that crashed (everything we create starts with "E2E-").
  try {
    await purgeEntries(page, "E2E-");
    await purgeCategories(page, "E2E-");
  } catch {
    /* not fatal */
  }
});
