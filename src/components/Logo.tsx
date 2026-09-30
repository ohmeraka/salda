export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ flex: "none" }}>
      <rect width="32" height="32" rx="2" fill="var(--color-accent)" />
      <path
        d="M24 10.5H13a3.2 3.2 0 0 0 0 6.4h6a3.2 3.2 0 0 1 0 6.4H8"
        fill="none"
        stroke="var(--color-bg)"
        strokeWidth={3.4}
      />
    </svg>
  );
}

export function Logo({ markSize = 32, wordmarkSize = 24 }: { markSize?: number; wordmarkSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: wordmarkSize, letterSpacing: "-.02em" }}>
      <LogoMark size={markSize} />
      Salda
    </div>
  );
}
