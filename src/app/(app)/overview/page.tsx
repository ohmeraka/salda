import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getWorkspaceCategories } from "@/lib/data/categories";
import { getOverviewData } from "@/lib/data/overview";
import { getT } from "@/lib/i18n/server";
import { RecentRow } from "@/components/overview/RecentRow";

function StatTile({
  label,
  value,
  sub,
  color,
  strong,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  strong?: boolean;
}) {
  return (
    <div className={`ov-stat${strong ? " ov-stat-strong" : ""}`}>
      <div className="kicker" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className="ov-stat-num" style={{ color: color ?? "inherit" }}>
        {value}
      </div>
      {sub && <div className="ov-stat-sub">{sub}</div>}
    </div>
  );
}

export default async function OverviewPage() {
  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");
  const { workspace } = current;

  const translator = await getT();
  const { t } = translator;

  const categories = await getWorkspaceCategories(workspace.id);
  const d = await getOverviewData(workspace.id, workspace.monthly_budget, workspace.base_currency, categories, translator);

  return (
    <div className="ov-wrap">
      <div className="ov-hero-grid">
        <div>
          <div className="kicker">{t("ov.balance")}</div>
          <div className="ov-hero-num" style={{ color: d.balanceColor, marginBottom: 6 }}>
            {d.balance}
          </div>
          <div style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>{t("ov.balanceSub")}</div>

          <div className="kicker" style={{ marginTop: 28 }}>
            {d.monthLabel}
          </div>
          <div className="ov-stats" style={{ marginTop: 8 }}>
            <StatTile label={t("ov.income")} value={d.income} color="var(--color-accent-700)" />
            <StatTile label={t("ov.net")} value={d.net} sub={t("ov.netSub")} color={d.netColor} strong />
            <StatTile label={t("sum.spent")} value={d.spent} color="#b45309" />
          </div>

          <div
            style={{
              height: 8,
              background: "var(--color-surface)",
              borderRadius: 2,
              overflow: "hidden",
              maxWidth: 560,
              marginTop: 18,
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
          </div>
        </div>
        <div>
          <div className="kicker">{t("ov.lastSix")}</div>
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
          <h3 style={{ fontSize: 22, margin: "0 0 16px" }}>{t("ov.byCategory")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {d.categoryRows.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
                {t("ov.noCategories")}
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
          <h3 style={{ fontSize: 22, margin: "0 0 16px" }}>{t("ov.topMerchants")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
            {d.topMerchants.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
                {t("ov.noPurchasesMonth")}
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

          <h3 style={{ fontSize: 22, margin: "0 0 4px" }}>{t("ov.comingUp", { month: d.nextMonthLabel })}</h3>
          <p style={{ fontSize: 14, color: "var(--color-neutral-700)", margin: "0 0 14px" }}>
            {d.upcoming.length === 0 ? t("ov.nothingRecurring") : t("ov.recurringCosts", { amount: d.upcomingTotal })}
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
          <h3 style={{ fontSize: 22, margin: 0 }}>{t("ov.recent")}</h3>
          <Link href="/activity" className="btn btn-ghost" style={{ minHeight: 44 }}>
            {t("ov.allCosts")}
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {d.recent.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 15, padding: "24px 8px" }}>
              {t("ov.noCosts")}
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
