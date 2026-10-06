import { Logo } from "@/components/Logo";
import { WelcomeForm } from "@/components/auth/WelcomeForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getT } from "@/lib/i18n/server";

export default async function WelcomePage() {
  const { t } = await getT();
  return (
    <div style={{ padding: "28px 20px 36px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", maxWidth: 1040, margin: "0 auto" }}>
        <LanguageSwitcher />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "40px 80px",
          alignItems: "start",
          maxWidth: 1040,
          margin: "24px auto 0",
        }}
      >
        <div>
          <div style={{ marginBottom: 20 }}>
            <Logo markSize={36} wordmarkSize={24} />
          </div>
          <h1
            style={{
              fontSize: "clamp(50px, 8vw, 76px)",
              lineHeight: 1.02,
              margin: "0 0 20px",
              maxWidth: "8em",
            }}
          >
            {t("welcome.headline")}
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, maxWidth: "24em", color: "var(--color-neutral-700)" }}>
            {t("welcome.tagline")}
          </p>
        </div>

        <WelcomeForm />
      </div>
    </div>
  );
}
