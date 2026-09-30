import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client using the SERVICE ROLE key. Bypasses Row Level Security —
 * this file must never be imported from a Client Component, and the key
 * must never leave the server. Used only for sending workspace invite
 * emails to people who may not have an account yet.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
