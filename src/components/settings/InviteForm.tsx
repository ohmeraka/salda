"use client";

import { useState, type FormEvent } from "react";
import { inviteMember } from "@/app/actions/members";
import { useToast } from "@/lib/toast-context";
import type { Role } from "@/types/database";

export function InviteForm() {
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("role", role);
    const result = await inviteMember(fd);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setEmail("");
    show("Invite sent");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ minHeight: 44, fontSize: 16, flex: "1 1 220px" }}
          type="email"
          placeholder="their@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="seg">
          <label className="seg-opt" style={{ whiteSpace: "nowrap" }}>
            <input type="radio" name="invrole" checked={role === "member"} onChange={() => setRole("member")} />
            Member
          </label>
          <label className="seg-opt" style={{ whiteSpace: "nowrap" }}>
            <input type="radio" name="invrole" checked={role === "owner"} onChange={() => setRole("owner")} />
            Owner
          </label>
        </div>
      </div>
      {error && <div style={{ fontSize: 14, color: "var(--color-accent-2-700)" }}>{error}</div>}
      <button
        type="submit"
        className="btn btn-primary"
        style={{ minHeight: 44, alignSelf: "flex-start", padding: "0 24px" }}
        disabled={busy}
      >
        {busy ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
