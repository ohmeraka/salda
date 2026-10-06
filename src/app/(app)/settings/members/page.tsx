import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getWorkspaceRoster } from "@/lib/data/members";
import { createClient } from "@/lib/supabase/server";
import { MemberRow } from "@/components/settings/MemberRow";
import { InviteRow } from "@/components/settings/InviteRow";
import { InviteForm } from "@/components/settings/InviteForm";
import { getT } from "@/lib/i18n/server";

export default async function MembersPage() {
  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");
  const { workspace, role } = current;

  const { t } = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/welcome");

  const { members, invites } = await getWorkspaceRoster(workspace.id, user.id, t("mem.defaultName"));
  const canManage = role === "owner";

  return (
    <div className="ov-wrap" style={{ maxWidth: 600 }}>
      <div>
        <Link href="/settings" className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: 0 }}>
          {t("mem.back")}
        </Link>
        <h1 className="page-h1" style={{ marginTop: 8 }}>
          {t("mem.title")}
        </h1>
        <p style={{ color: "var(--color-neutral-700)", margin: "6px 0 0" }}>
          {canManage ? t("mem.manageHelp") : t("mem.ownerOnlyHelp")}
        </p>
      </div>

      <div>
        <h3 style={{ fontSize: 22, margin: "0 0 8px" }}>{t("mem.members")}</h3>
        <div>
          {members.map((m) => (
            <MemberRow key={m.userId} member={m} canManage={canManage} />
          ))}
        </div>
      </div>

      {canManage && (
        <div>
          <h3 style={{ fontSize: 22, margin: "0 0 8px" }}>{t("mem.pending")}</h3>
          {invites.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
              {t("mem.noPending")}
            </p>
          ) : (
            <div>
              {invites.map((i) => (
                <InviteRow key={i.id} invite={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div>
          <h3 style={{ fontSize: 22, margin: "0 0 8px" }}>{t("mem.invite")}</h3>
          <InviteForm />
        </div>
      )}
    </div>
  );
}
