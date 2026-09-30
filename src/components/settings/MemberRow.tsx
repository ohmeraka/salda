"use client";

import { useState } from "react";
import { changeMemberRole, removeMember } from "@/app/actions/members";
import { useToast } from "@/lib/toast-context";
import type { MemberRow as MemberRowData } from "@/lib/data/members";
import type { Role } from "@/types/database";

export function MemberRow({ member, canManage }: { member: MemberRowData; canManage: boolean }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleRoleChange(role: Role) {
    setBusy(true);
    const result = await changeMemberRole(member.userId, role);
    setBusy(false);
    if ("error" in result) {
      show(result.error);
      return;
    }
    show("Role updated");
  }

  async function handleRemove() {
    setBusy(true);
    const result = await removeMember(member.userId);
    setBusy(false);
    if ("error" in result) {
      show(result.error);
      return;
    }
    show("Member removed");
  }

  const canManageThisRow = canManage && !member.isSelf;

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
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16 }}>
          {member.displayName}
          {member.isSelf ? " (you)" : ""}
        </div>
        {member.email && <div style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{member.email}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        {canManageThisRow ? (
          <select
            className="input"
            style={{ width: "auto", minHeight: 40, fontSize: 14 }}
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value as Role)}
            disabled={busy}
            aria-label={`Role for ${member.displayName}`}
          >
            <option value="member">Member</option>
            <option value="owner">Owner</option>
          </select>
        ) : (
          <span className={`tag ${member.role === "owner" ? "tag-accent" : "tag-neutral"}`}>
            {member.role === "owner" ? "Owner" : "Member"}
          </span>
        )}
        {canManageThisRow && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 40, color: "var(--color-accent-2-700)" }}
            onClick={handleRemove}
            disabled={busy}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
