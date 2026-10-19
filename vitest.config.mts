import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests cover the pure logic in src/lib (no browser, no Supabase needed).
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
