import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types/database";

export interface MemberRow {
  userId: string;
  displayName: string;
  email: string | null;
  role: Role;
  isSelf: boolean;
}

export interface InviteRow {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

interface MemberJoinRow {
  user_id: string;
  role: Role;
  joined_at: string;
  profile: { display_name: string | null; email: string | null } | { display_name: string | null; email: string | null }[] | null;
}

function firstProfile(profile: MemberJoinRow["profile"]) {
  return Array.isArray(profile) ? profile[0] : profile;
}

export async function getWorkspaceRoster(
  workspaceId: string,
  currentUserId: string
): Promise<{ members: MemberRow[]; invites: InviteRow[] }> {
  const supabase = await createClient();

  const [{ data: memberRows, error: memberError }, { data: inviteRows, error: inviteError }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id, role, joined_at, profile:profiles(display_name, email)")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("workspace_invites")
      .select("id, email, role, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  if (memberError) throw new Error(memberError.message);
  if (inviteError) throw new Error(inviteError.message);

  const members = ((memberRows ?? []) as unknown as MemberJoinRow[]).map((m) => {
    const profile = firstProfile(m.profile);
    return {
      userId: m.user_id,
      displayName: profile?.display_name ?? "Member",
      email: profile?.email ?? null,
      role: m.role,
      isSelf: m.user_id === currentUserId,
    };
  });

  const invites = (inviteRows ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role as Role,
    createdAt: i.created_at,
  }));

  return { members, invites };
}
