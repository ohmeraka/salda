"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. Uses the public anon key — safe
 * to expose since every table is locked down with Row Level Security.
 *
 * Not parameterized with a Database generic — see the note in server.ts.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
