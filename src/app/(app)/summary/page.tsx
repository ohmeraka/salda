import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getWorkspaceCategories } from "@/lib/data/categories";
import { getSummaryData, type SummaryRange } from "@/lib/data/summary";
import { SummaryRangeControl } from "@/components/summary/SummaryRangeControl";
import { ExportCsvButton } from "@/components/ExportCsvButton";

function parseRange(value: string | undefined): SummaryRange {
  return value === "quarter" || value === "half" ? value : "month";
}

function StatCell({
  kicker,
  value,
  sub,
  color,
  bold,
  tag,
}: {
  kicker: string;
  value: string;
  sub?: string;
  color?: string;
  bold?: boolean;
  tag?: { text: string; className: string };
}) {
  return (
    <div>
      <div className="kicker">{kicker}</div>
      <div
        style={{
          fontSize: 34,
          fontWeight: bold ? 700 : 600,
          letterSpacing: "-.02em",
          fontVariantNumeric: "tabular-nums",
          color: color ?? "inherit",
        }}
      >
        {value}
      </div>
      {tag && <span className={`tag ${tag.className}`}>{tag.text}</span>}
      {sub && <div style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{sub}</div>}
    </div>
  );
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");
  const { workspace } = current;

  const range = parseRange(params.range);
  const categories = await getWorkspaceCategories(workspace.id);
  const s = await getSummaryData(workspace.id, workspace.base_currency, range, categories);

  return (
    <div className="ov-wrap">
      <div>
        <div className="kicker">Summary</div>
        <h1 className="page-h1" style={{ marginBottom: 20 }}>
          {s.title}
        </h1>
        <SummaryRangeControl range={range} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
          gap: "24px 32px",
        }}
      >
        <StatCell
          kicker="Spent"
          value={s.total}
          tag={s.hasDelta ? { text: s.deltaText, className: s.deltaClass } : undefined}
        />
        <StatCell kicker="Income" value={s.income} color="var(--color-accent-700)" bold />
        <StatCell kicker="Net" value={s.net} color={s.netColor} bold />
        <StatCell kicker="Per day" value={s.perDay} />
        <StatCell kicker="Costs logged" value={String(s.count)} />
        <StatCell kicker="Largest" value={s.largest} sub={s.largestWhere} />
      </div>

      {s.hasBars && (
        <div>
          <h3 style={{ fontSize: 22, margin: "0 0 16px" }}>Month by month</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 170, maxWidth: 640 }}>
            {s.bars.map((b) => (
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
      )}

      <div className="ov-two-col">
        <div>
          <h3 style={{ fontSize: 22, margin: "0 0 16px" }}>By category</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {s.categoryShare.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
                No costs logged in this range.
              </p>
            ) : (
              s.categoryShare.map((c) => (
                <div key={c.name}>
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
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {c.amount} <span style={{ color: "var(--color-neutral-700)", fontSize: 13 }}>{c.pct}</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: "var(--color-surface)", borderRadius: 2 }}>
                    <div
                      style={{ height: "100%", width: `${c.widthPct}%`, background: c.color, borderRadius: 2 }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 22, margin: "0 0 16px" }}>Top merchants</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {s.merchants.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
                No purchases logged in this range.
              </p>
            ) : (
              s.merchants.map((m) => (
                <div key={m.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15 }}>
                  <span>
                    {m.name} <span style={{ color: "var(--color-neutral-700)", fontSize: 13 }}>×{m.count}</span>
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{m.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <ExportCsvButton />
      </div>
    </div>
  );
}
