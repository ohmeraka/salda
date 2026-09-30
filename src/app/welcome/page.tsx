import { Logo } from "@/components/Logo";
import { WelcomeForm } from "@/components/auth/WelcomeForm";

export default function WelcomePage() {
  return (
    <div style={{ padding: "28px 20px 36px" }}>
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
            Know where it went.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, maxWidth: "24em", color: "var(--color-neutral-700)" }}>
            Log every cost by hand, or photograph the receipt and let Salda read it. See the month at a glance on
            your phone or on the web.
          </p>
        </div>

        <WelcomeForm />
      </div>
    </div>
  );
}
