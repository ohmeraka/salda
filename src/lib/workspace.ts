import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Role, Workspace } from "@/types/database";

const WORKSPACE_COOKIE = "current_workspace";

export interface WorkspaceMembership {
  workspace: Workspace;
  role: Role;
}

/** All workspaces the signed-in user belongs to, with their role in each. */
export async function getUserWorkspaces(): Promise<WorkspaceMembership[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(*)")
    .order("joined_at", { ascending: true });

  if (error || !data) return [];

  return data
    .filter((row) => row.workspace)
    .map((row) => ({
      workspace: row.workspace as unknown as Workspace,
      role: row.role as Role,
    }));
}

/**
 * The workspace the user is currently viewing: whichever is saved in the
 * `current_workspace` cookie, falling back to the first workspace they
 * belong to. Returns null if they belong to none yet.
 */
export async function getCurrentWorkspace(): Promise<WorkspaceMembership | null> {
  const memberships = await getUserWorkspaces();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const savedId = cookieStore.get(WORKSPACE_COOKIE)?.value;

  return memberships.find((m) => m.workspace.id === savedId) ?? memberships[0];
}

export { WORKSPACE_COOKIE };
