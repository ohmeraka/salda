"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getT } from "@/lib/i18n/server";

type ActionResult = { error: string } | { success: true };

function parseBudget(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const value = parseInt(digits, 10);
  return value > 0 ? value : null;
}

export async function updateWorkspaceBudget(formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const current = await getCurrentWorkspace();
  if (!current) return { error: t("err.noWorkspace") };

  const value = parseBudget(String(formData.get("budget") ?? ""));
  if (value == null) return { error: t("err.budget") };

  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").update({ monthly_budget: value }).eq("id", current.workspace.id);
  if (error) return { error: error.message };

  revalidatePath("/overview");
  revalidatePath("/settings");
  return { success: true };
}

export async function addCategory(formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const current = await getCurrentWorkspace();
  if (!current) return { error: t("err.noWorkspace") };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("err.signedOut") };

  const { error } = await supabase.from("categories").insert({
    workspace_id: current.workspace.id,
    name,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: t("err.categoryExists") };
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/overview");
  revalidatePath("/activity");
  return { success: true };
}

export async function updateCategoryBudget(categoryId: string, formData: FormData): Promise<ActionResult> {
  const raw = String(formData.get("budget") ?? "").replace(/\D/g, "");
  const value = raw ? parseInt(raw, 10) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ monthly_budget: value && value > 0 ? value : null })
    .eq("id", categoryId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/overview");
  return { success: true };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  const { t } = await getT();
  const supabase = await createClient();

  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (count && count > 0) return { error: t("err.categoryInUse") };

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/overview");
  revalidatePath("/activity");
  return { success: true };
}
