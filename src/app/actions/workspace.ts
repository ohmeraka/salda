"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

/** Switch which workspace the signed-in user is currently viewing. */
export async function setCurrentWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
