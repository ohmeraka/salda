import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getWorkspaceCategories } from "@/lib/data/categories";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { ToastProvider } from "@/lib/toast-context";
import { EditorProvider } from "@/lib/editor-context";
import { MobileNav, DesktopNav } from "@/components/Nav";
import { AddEditSheet } from "@/components/AddEditSheet";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/welcome");

  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");

  const categories = await getWorkspaceCategories(current.workspace.id);
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "there";

  return (
    <WorkspaceProvider
      value={{ workspace: current.workspace, role: current.role, userId: user.id, displayName, categories }}
    >
      <ToastProvider>
        <EditorProvider>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <DesktopNav />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="page-shell">{children}</div>
            </div>
          </div>
          <MobileNav />
          <AddEditSheet />
        </EditorProvider>
      </ToastProvider>
    </WorkspaceProvider>
  );
}
