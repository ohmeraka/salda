"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

/**
 * Ensures the signed-in user belongs to at least one workspace. The Salda
 * design has no separate "create your workspace" screen — confirming your
 * email lands you straight on Overview — so the first workspace is
 * created silently here, named after the account.
 */
async function ensureWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, displayName: string) {
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: `${displayName}'s Salda`, created_by: userId, base_currency: "BAM" })
    .select()
    .single();

  if (workspaceError || !workspace) return;

  await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });

  // A handful of sensible starting categories so Overview/Activity aren't empty.
  const defaults = [
    { name: "Groceries", monthly_budget: null },
    { name: "Utilities", monthly_budget: null },
    { name: "Rent/Mortgage", monthly_budget: null },
    { name: "Transport", monthly_budget: null },
    { name: "Dining out", monthly_budget: null },
    { name: "Other", monthly_budget: null },
  ];
  await supabase.from("categories").insert(
    defaults.map((c) => ({ ...c, workspace_id: workspace.id, created_by: userId }))
  );

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function signUp(
  formData: FormData
): Promise<{ error: string } | { success: true; email: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });

  if (error) return { error: error.message };
  return { success: true, email };
}

export async function signIn(formData: FormData): Promise<{ error: string } | never> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  if (data.user) {
    await supabase.rpc("accept_pending_invites");
    await ensureWorkspace(supabase, data.user.id, data.user.user_metadata?.display_name ?? "My");
  }

  redirect("/overview");
}

export async function confirmEmail(
  email: string,
  token: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error) return { error: error.message };

  if (data.user) {
    await supabase.rpc("accept_pending_invites");
    await ensureWorkspace(supabase, data.user.id, data.user.user_metadata?.display_name ?? "My");
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
