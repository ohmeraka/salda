"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { NavGlyph } from "@/components/icons";
import { useEditor } from "@/lib/editor-context";
import { useWorkspace } from "@/lib/workspace-context";

const TABS = [
  { href: "/overview", icon: "home" as const, label: "Overview" },
  { href: "/activity", icon: "costs" as const, label: "Activity" },
];
const TABS_AFTER_ADD = [
  { href: "/summary", icon: "summary" as const, label: "Summary" },
  { href: "/settings", icon: "settings" as const, label: "Settings" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav() {
  const pathname = usePathname();
  const { openAdd } = useEditor();

  return (
    <nav
      className="min-[900px]:hidden"
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        background: "var(--color-bg)",
        borderTop: "1px solid var(--color-divider)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map((t) => (
        <TabLink key={t.href} tab={t} active={isActive(pathname, t.href)} />
      ))}
      <button
        onClick={openAdd}
        aria-label="Add"
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "var(--color-accent)",
          color: "var(--color-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 8px",
          marginTop: -6,
          border: "none",
          cursor: "pointer",
          flex: "none",
        }}
      >
        <NavGlyph name="add" size={26} />
      </button>
      {TABS_AFTER_ADD.map((t) => (
        <TabLink key={t.href} tab={t} active={isActive(pathname, t.href)} />
      ))}
    </nav>
  );
}

function TabLink({
  tab,
  active,
}: {
  tab: { href: string; icon: "home" | "costs" | "summary" | "settings"; label: string };
  active: boolean;
}) {
  return (
    <Link
      href={tab.href}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "8px 0",
        color: active ? "var(--color-accent)" : "var(--color-neutral-700)",
        textDecoration: "none",
        fontSize: 11,
        minHeight: 44,
      }}
    >
      <NavGlyph name={tab.icon} size={22} />
      {tab.label}
    </Link>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  const { openAdd } = useEditor();
  const { displayName } = useWorkspace();
  const allTabs = [TABS[0], TABS[1], ...TABS_AFTER_ADD];

  return (
    <nav
      className="hidden min-[900px]:flex"
      style={{
        flexDirection: "column",
        width: 232,
        flex: "none",
        padding: "36px 16px 28px",
        gap: 4,
        borderRight: "1px solid var(--color-divider)",
        minHeight: "100vh",
      }}
    >
      <div style={{ margin: "0 0 28px 12px" }}>
        <Logo markSize={32} wordmarkSize={26} />
      </div>

      <button onClick={openAdd} className="btn btn-primary btn-block" style={{ marginBottom: 16, fontSize: 16 }}>
        <NavGlyph name="add" size={20} />
        Add
      </button>

      {allTabs.map((t) => {
        const active = isActive(pathname, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 2,
              color: active ? "var(--color-accent-700)" : "var(--color-text)",
              background: active ? "var(--color-accent-100)" : "transparent",
              textDecoration: "none",
              fontSize: 15,
              minHeight: 44,
            }}
          >
            <NavGlyph name={t.icon} size={22} />
            {t.label}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", padding: "0 12px", fontSize: 13, color: "var(--color-neutral-700)" }}>
        Signed in as
        <br />
        <span style={{ color: "var(--color-text)", fontSize: 15 }}>{displayName}</span>
      </div>
    </nav>
  );
}
