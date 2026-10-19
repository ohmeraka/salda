import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a real browser.
 *
 * - Default: starts the app itself (`npm run build && npm run start` in CI,
 *   `npm run dev` locally) on http://localhost:3100.
 * - E2E_BASE_URL=https://your-preview.vercel.app  -> tests that URL instead
 *   and does not start a local server.
 *
 * The signed-out tests need no real Supabase project. The signed-in tests run
 * only when E2E_EMAIL and E2E_PASSWORD are set (use a TEST account on your
 * DEV Supabase project, never your real data).
 *
 * Supabase settings: if a .env.local file exists, the app uses it (point it at
 * your DEV project). If not (e.g. on GitHub), harmless placeholders are used so
 * the app can start; signed-out requests never reach the network.
 */
const externalUrl = process.env.E2E_BASE_URL;
const port = 3100;
const baseURL = externalUrl ?? `http://localhost:${port}`;
const isCI = !!process.env.CI;
const hasEnvFile = existsSync(".env.local");

const placeholderEnv: Record<string, string> = hasEnvFile
  ? {}
  : {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-key",
    };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // The signed-in tests share one real dev-DB account and one dev server; much above this
  // and both start to time out under their own concurrent load (slow responses, occasional
  // crossed reads of the account-wide totals).
  workers: 3,
  // Even locally: tests share one real dev-DB account and run in parallel, so an
  // occasional transient timing clash under load is expected, not a real failure.
  retries: 1,
  // A bit above the 30s default: tests that clean up several tagged entries (several
  // sequential UI round trips) can brush against it when the dev server is under load
  // from other tests running in parallel against the same real backend.
  timeout: 60_000,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    // Optional: use an already-installed Chromium (PW_CHROMIUM_PATH=/path/to/chrome).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Signs in once and saves the session for the signed-in tests (skipped without E2E_EMAIL/E2E_PASSWORD).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    // A narrow phone viewport, but still Chromium so only one browser must be installed.
    {
      name: "phone",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: externalUrl
    ? undefined
    : {
        command: isCI ? `npm run build && npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
        url: `${baseURL}/welcome`,
        reuseExistingServer: !isCI,
        timeout: 240_000,
        env: placeholderEnv,
      },
});
