"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/ensure-workspace";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n";

/** Swaps Supabase's few well-known English auth errors for translated ones; anything else passes through. */
function authError(t: Translator["t"], message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return t("err.invalidLogin");
  if (m.includes("user already registered")) return t("err.userExists");
  if (m.includes("email not confirmed")) return t("err.emailNotConfirmed");
  return message;
}

export async function signUp(
  formData: FormData
): Promise<{ error: string } | { success: true; email: string; confirmed: boolean }> {
  const { t } = await getT();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: t("err.nameRequired") };
  if (!email) return { error: t("err.emailRequired") };
  if (password.length < 8) return { error: t("err.passwordShort") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });

  if (error) return { error: authError(t, error.message) };

  // If this Supabase project has "Confirm email" turned off, signUp()
  // returns an active session immediately — no code was ever sent, so
  // skip the confirm screen and get the account ready right away.
  if (data.session && data.user) {
    await supabase.rpc("accept_pending_invites");
    const setupError = await ensureWorkspace(supabase, data.user.id, data.user.user_metadata?.display_name ?? "My");
    if (setupError) return { error: setupError };
    return { success: true, email, confirmed: true };
  }

  return { success: true, email, confirmed: false };
}

export async function signIn(formData: FormData): Promise<{ error: string } | never> {
  const { t } = await getT();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: authError(t, error.message) };

  if (data.user) {
    await supabase.rpc("accept_pending_invites");
    const setupError = await ensureWorkspace(supabase, data.user.id, data.user.user_metadata?.display_name ?? "My");
    if (setupError) return { error: setupError };
  }

  redirect("/overview");
}

export async function confirmEmail(
  email: string,
  token: string
): Promise<{ error: string } | { success: true }> {
  const { t } = await getT();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error) return { error: authError(t, error.message) };

  if (data.user) {
    await supabase.rpc("accept_pending_invites");
    const setupError = await ensureWorkspace(supabase, data.user.id, data.user.user_metadata?.display_name ?? "My");
    if (setupError) return { error: setupError };
  }

  return { success: true };
}

export async function resendConfirmation(email: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: error.message };
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}
