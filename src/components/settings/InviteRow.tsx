"use client";

import { useState } from "react";
import { revokeInvite } from "@/app/actions/members";
import { useToast } from "@/lib/toast-context";
import { useT } from "@/lib/i18n/client";
import type { InviteRow as InviteRowData } from "@/lib/data/members";

export function InviteRow({ invite }: { invite: InviteRowData }) {
  const { show } = useToast();
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function handleRevoke() {
    setBusy(true);
    const result = await revokeInvite(invite.id);
    setBusy(false);
    if ("error" in result) {
      show(result.error);
      return;
    }
    show(t("toast.inviteRevoked"));
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--color-divider)",
      }}
    >
      <div>
        <div style={{ fontSize: 16 }}>{invite.email}</div>
        <div style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>
          {invite.role === "owner" ? t("role.owner") : t("role.member")} · {t("mem.pendingTag")}
        </div>
      </div>
      <button type="button" className="btn btn-ghost" style={{ minHeight: 40 }} onClick={handleRevoke} disabled={busy}>
        {t("mem.revoke")}
      </button>
    </div>
  );
}
