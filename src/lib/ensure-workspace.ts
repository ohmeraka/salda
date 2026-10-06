import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n/server";
import { DEFAULT_CATEGORIES } from "@/lib/i18n/categories";

/**
 * Ensures the signed-in user belongs to at least one workspace. The Salda
 * design has no separate "create your workspace" screen — confirming your
 * email lands you straight on Overview — so the first workspace is
 * created silently, named after the account.
 *
 * Returns null on success (or if a workspace already exists), otherwise a
 * human-readable error message so callers can show it instead of failing
 * silently.
 */
export async function ensureWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  displayName: string
): Promise<string | null> {
  const { data: existing, error: lookupError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);

  if (lookupError) return `Could not read workspaces: ${lookupError.message}`;
  if (existing && existing.length > 0) return null;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: `${displayName}'s Salda`, created_by: userId, base_currency: "BAM" })
    .select()
    .single();

  if (workspaceError || !workspace) {
    return `Could not create workspace: ${workspaceError?.message ?? "unknown error"}`;
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });
  if (memberError) return `Could not add you to the workspace: ${memberError.message}`;

  // A handful of sensible starting categories so Overview/Activity aren't empty.
  const locale = await getLocale();
  const defaults = DEFAULT_CATEGORIES[locale].map((name) => ({ name, monthly_budget: null }));
  await supabase.from("categories").insert(
    defaults.map((c) => ({ ...c, workspace_id: workspace.id, created_by: userId }))
  );

  try {
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, workspace.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } catch {
    // Called while rendering a Server Component, where cookies are read-only.
    // Harmless: the first workspace is picked automatically without the cookie.
  }

  return null;
}
