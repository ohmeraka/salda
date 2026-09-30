import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getWorkspaceCategories } from "@/lib/data/categories";
import { getOverviewData } from "@/lib/data/overview";
import { RecentRow } from "@/components/overview/RecentRow";

export default async function OverviewPage() {
  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");
  const { workspace } = current;

  const categories = await getWorkspaceCategories(workspace.id);
  const d = await getOverviewData(workspace.id, workspace.monthly_budget, workspace.base_currency, categories);

  return (
    <div className="ov-wrap">
      <div className="ov-hero-grid">
        <div>
          <div className="kicker">{d.monthLabel} · spent so far</div>
          <div className="ov-hero-num">{d.spentWhole}</div>
          <div
            style={{
              height: 8,
              background: "var(--color-surface)",
              borderRadius: 2,
              overflow: "hidden",
              maxWidth: 420,
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 2,
                width: `${d.budgetBarPct}%`,
                background: d.budgetBarColor,
              }}
            />
          </div>
          <div className="ov-hero-row">
            <span>{d.budgetLine}</span>
            <span className={`tag ${d.deltaClass}`}>{d.deltaText}</span>
            <span>
              Income <strong style={{ color: "var(--color-accent-700)" }}>{d.income}</strong>
            </span>
            <span>
              Net <strong style={{ color: d.netColor }}>{d.net}</strong>
            </span>
          </div>
        </div>
        <div>
          <div className="kicker">Last six months</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 170 }}>
            {d.sixMonthBars.map((b) => (
              <div
                key={b.key}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                  height: "100%",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--color-neutral-700)", fontVariantNumeric: "tabular-nums" }}>
                  {b.value}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 44,
                    borderRadius: "2px 2px 0 0",
                    height: b.heightPx,
                    background: b.current ? "var(--color-accent)" : "var(--color-neutral-300)",
                  }}
                />
                <span style={{ fontSize: 12 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ov-two-col">
        <div>
          <h3 style={{ fontSize: 22, margin: "0 0 16px" }}>By category</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {d.categoryRows.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
                No categories yet — add one in Settings.
              </p>
            ) : (
              d.categoryRows.map((c) => (
                <div key={c.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 15,
                      marginBottom: 5,
                    }}
                  >
                    <span>{c.name}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{c.amountLabel}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--color-surface)", borderRadius: 2 }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${c.widthPct}%`,
                        background: c.color,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 22, margin: "0 0 16px" }}>Top merchants</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
            {d.topMerchants.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
                No purchases logged yet this month.
              </p>
            ) : (
              d.topMerchants.map((m) => (
                <div key={m.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15 }}>
                  <span>
                    {m.name} <span style={{ color: "var(--color-neutral-700)", fontSize: 13 }}>×{m.count}</span>
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{m.amount}</span>
                </div>
              ))
            )}
          </div>

          <h3 style={{ fontSize: 22, margin: "0 0 4px" }}>Coming up in {d.nextMonthLabel}</h3>
          <p style={{ fontSize: 14, color: "var(--color-neutral-700)", margin: "0 0 14px" }}>
            {d.upcoming.length === 0 ? "Nothing recurring yet." : `${d.upcomingTotal} in recurring costs`}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {d.upcoming.map((u) => (
              <div
                key={u.key}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", fontSize: 15 }}
              >
                <span>
                  <span style={{ display: "inline-block", minWidth: 52, color: "var(--color-accent-700)" }}>
                    {u.when}
                  </span>
                  {u.label}
                </span>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: u.isIncome ? "var(--color-accent-700)" : "inherit",
                  }}
                >
                  {u.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <h3 style={{ fontSize: 22, margin: 0 }}>Recent</h3>
          <Link href="/activity" className="btn btn-ghost" style={{ minHeight: 44 }}>
            All costs ›
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {d.recent.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 15, padding: "24px 8px" }}>
              No costs logged yet.
            </p>
          ) : (
            d.recent.map((r) => (
              <RecentRow key={r.tx.id} tx={r.tx} categoryName={r.categoryName} meta={r.meta} amount={r.amount} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
