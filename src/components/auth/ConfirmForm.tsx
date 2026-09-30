"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmEmail, resendConfirmation } from "@/app/actions/auth";

export function ConfirmForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the six-digit code.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await confirmEmail(email, code);
    setBusy(false);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    router.push("/overview");
  }

  async function handleResend() {
    setError("");
    setResent(false);
    const result = await resendConfirmation(email);
    if (result && "error" in result) {
      setError(result.error);
      return;
    }
    setResent(true);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: "40px 72px",
        alignItems: "start",
        maxWidth: 1040,
        margin: "24px auto 0",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Link href="/welcome" className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>
          ‹ Change address
        </Link>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 46px)", margin: 0 }}>Check your inbox.</h1>
        <p style={{ fontSize: 17, color: "var(--color-neutral-700)", maxWidth: "24em", margin: 0 }}>
          We sent a confirmation code to <strong style={{ color: "var(--color-text)" }}>{email}</strong>.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field" style={{ maxWidth: 280 }}>
            <label>Confirmation code</label>
            <input
              className="input"
              style={{ minHeight: 52, fontSize: 26, letterSpacing: ".3em", textAlign: "center" }}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="······"
            />
          </div>
          {error && <div style={{ fontSize: 14, color: "var(--color-accent-2-700)" }}>{error}</div>}
          {resent && !error && (
            <div style={{ fontSize: 14, color: "var(--color-accent-700)" }}>New code sent.</div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary" style={{ padding: "0 28px", fontSize: 16 }} disabled={busy}>
              {busy ? "Confirming…" : "Confirm email"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleResend}>
              Resend email
            </button>
          </div>
        </form>
      </div>
      <div className="card" style={{ padding: 24, gap: 10 }}>
        <div className="card-kicker">Tip</div>
        <p style={{ fontSize: 15, margin: 0, color: "var(--color-neutral-700)" }}>
          The email can take a minute to arrive. Check spam if you don&apos;t see it, or use Resend above.
        </p>
      </div>
    </div>
  );
}
