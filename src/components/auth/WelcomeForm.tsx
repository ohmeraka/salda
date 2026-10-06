"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/app/actions/auth";
import { ProviderIcon, type ProviderName } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

const PROVIDERS: ProviderName[] = ["Google", "Apple", "Microsoft", "GitHub"];

export function WelcomeForm() {
  const router = useRouter();
  const { t } = useT();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "signup" && !name.trim()) {
      setError(t("err.nameRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("err.emailInvalid"));
      return;
    }
    if (password.length < 8) {
      setError(t("err.passwordShort"));
      return;
    }

    setBusy(true);
    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    if (mode === "signup") formData.set("name", name);

    if (mode === "signup") {
      const result = await signUp(formData);
      setBusy(false);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      if (result.confirmed) {
        router.push("/overview");
      } else {
        router.push(`/confirm?email=${encodeURIComponent(email)}`);
      }
    } else {
      const result = await signIn(formData);
      setBusy(false);
      if (result && "error" in result) {
        setError(result.error);
      }
      // signIn redirects to /overview on success.
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="seg" style={{ alignSelf: "flex-start" }}>
        <label className="seg-opt" style={{ whiteSpace: "nowrap" }}>
          <input type="radio" name="authmode" checked={mode === "signup"} onChange={() => setMode("signup")} />
          {t("welcome.signUp")}
        </label>
        <label className="seg-opt" style={{ whiteSpace: "nowrap" }}>
          <input type="radio" name="authmode" checked={mode === "signin"} onChange={() => setMode("signin")} />
          {t("welcome.signIn")}
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {PROVIDERS.map((provider) => (
          <button
            key={provider}
            type="button"
            className="btn btn-secondary"
            disabled
            title={t("welcome.soonTitle")}
            style={{ justifyContent: "flex-start", gap: 10, fontSize: 15, position: "relative" }}
          >
            <ProviderIcon provider={provider} />
            {provider}
            <span className="tag tag-neutral" style={{ marginLeft: "auto" }}>
              {t("common.soon")}
            </span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{t("welcome.orWithEmail")}</div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {mode === "signup" && (
          <div className="field">
            <label>{t("welcome.name")}</label>
            <input
              className="input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("welcome.namePlaceholder")}
            />
          </div>
        )}
        <div className="field">
          <label>{t("welcome.email")}</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("welcome.emailPlaceholder")}
          />
        </div>
        <div className="field">
          <label>{t("welcome.password")}</label>
          <input
            className="input"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("welcome.passwordPlaceholder")}
          />
        </div>
        {error && <div style={{ fontSize: 14, color: "var(--color-accent-2-700)" }}>{error}</div>}
        <button type="submit" className="btn btn-primary" style={{ fontSize: 16 }} disabled={busy}>
          {busy ? t("welcome.wait") : mode === "signup" ? t("welcome.createAccount") : t("welcome.signIn")}
        </button>
      </form>

      <p style={{ fontSize: 12, color: "var(--color-neutral-700)", margin: 0, maxWidth: "30em" }}>
        {t("welcome.terms")}
      </p>
    </div>
  );
}
