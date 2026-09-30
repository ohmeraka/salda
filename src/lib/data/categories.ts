import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/types/database";

export async function getWorkspaceCategories(workspaceId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}
