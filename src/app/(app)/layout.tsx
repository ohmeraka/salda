import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { ensureWorkspace } from "@/lib/ensure-workspace";
import { signOut } from "@/app/actions/auth";
import { getT } from "@/lib/i18n/server";
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

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "there";

  const { t } = await getT();

  let current = await getCurrentWorkspace();
  if (!current) {
    // Signed in but no workspace yet — try to create one. If that fails, show
    // why instead of redirecting to /welcome (the proxy bounces signed-in
    // users straight back, which makes an endless redirect loop).
    const setupError = await ensureWorkspace(supabase, user.id, displayName);
    current = await getCurrentWorkspace();
    if (!current) {
      return (
        <div style={{ maxWidth: 560, margin: "64px auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>{t("setup.title")}</h1>
          <p style={{ margin: 0, color: "var(--color-neutral-700)" }}>
            {setupError ?? t("setup.noWorkspace")} {t("setup.hint")}
          </p>
          <form action={signOut}>
            <button type="submit" className="btn btn-secondary">
              {t("set.signOut")}
            </button>
          </form>
        </div>
      );
    }
  }

  const categories = await getWorkspaceCategories(current.workspace.id);

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
