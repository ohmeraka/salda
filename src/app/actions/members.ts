"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import type { Role } from "@/types/database";

type ActionResult = { error: string } | { success: true };

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const current = await getCurrentWorkspace();
  if (!current) return { error: "No workspace found." };
  if (current.role !== "owner") return { error: "Only the owner can invite members." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = (String(formData.get("role") ?? "member") === "owner" ? "owner" : "member") as Role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: current.workspace.id,
    email,
    role,
    invited_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "That email has already been invited." };
    return { error: error.message };
  }

  revalidatePath("/settings/members");
  return { success: true };
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invites").delete().eq("id", inviteId);
  if (error) return { error: error.message };
  revalidatePath("/settings/members");
  return { success: true };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const current = await getCurrentWorkspace();
  if (!current) return { error: "No workspace found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", current.workspace.id)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/settings/members");
  return { success: true };
}

export async function changeMemberRole(userId: string, role: Role): Promise<ActionResult> {
  const current = await getCurrentWorkspace();
  if (!current) return { error: "No workspace found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", current.workspace.id)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/settings/members");
  return { success: true };
}
