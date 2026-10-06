"use client";

import { useMemo, useState } from "react";
import { useEditor } from "@/lib/editor-context";
import { useWorkspace } from "@/lib/workspace-context";
import { formatCurrency } from "@/lib/currency";
import { parseDateOnly } from "@/lib/periods";
import { SearchIcon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import { fmtDate } from "@/lib/i18n";
import { categoryLabel } from "@/lib/i18n/categories";
import type { ActivityItem } from "@/lib/data/activity";

const ALL = "__all";
const INCOME = "__income";

export function ActivityView({ items }: { items: ActivityItem[] }) {
  const { openEdit } = useEditor();
  const { categories, workspace } = useWorkspace();
  const { t, tn, locale } = useT();
  const [q, setQ] = useState("");
  // Filter keys are fixed sentinels (not display text) so they survive a language switch.
  const [catFilter, setCatFilter] = useState(ALL);

  const filtered = useMemo(() => {
    let list = items;
    if (catFilter === INCOME) list = list.filter((i) => i.isIncome);
    else if (catFilter !== ALL) list = list.filter((i) => !i.isIncome && i.tx.category_id === catFilter);
    const qq = q.trim().toLowerCase();
    if (qq) list = list.filter((i) => i.searchBlob.includes(qq));
    return list;
  }, [items, catFilter, q]);

  const costsOnly = filtered.filter((i) => !i.isIncome);
  const incomeOnly = filtered.filter((i) => i.isIncome);
  const costsTotal = costsOnly.reduce((sum, i) => sum + i.tx.amount, 0);
  const incomeTotal = incomeOnly.reduce((sum, i) => sum + i.tx.amount, 0);
  const fmt = (n: number) => formatCurrency(n, workspace.base_currency, 2, locale);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; total: number; hasCost: boolean; items: ActivityItem[] }>();
    for (const item of filtered) {
      let g = map.get(item.date);
      if (!g) {
        g = { label: fmtDate(parseDateOnly(item.date), "EEE, d MMM", locale), total: 0, hasCost: false, items: [] };
        map.set(item.date, g);
      }
      if (!item.isIncome) {
        g.total += item.tx.amount;
        g.hasCost = true;
      }
      g.items.push(item);
    }
    return Array.from(map.values());
  }, [filtered, locale]);

  const chips = [
    { key: ALL, label: t("act.all") },
    { key: INCOME, label: t("common.income") },
    ...categories.map((c) => ({ key: c.id, label: categoryLabel(c.name, locale) })),
  ];

  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 15, color: "var(--color-neutral-700)", marginBottom: 22 }}>
        {tn("act.costs", costsOnly.length)} · {fmt(costsTotal)}
        {incomeOnly.length > 0 ? ` · ${t("act.incomeSummary", { amount: fmt(incomeTotal) })}` : ""}
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: 13 }}>
          <SearchIcon />
        </span>
        <input
          className="input"
          style={{ minHeight: 44, fontSize: 16, paddingLeft: 38 }}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("act.search")}
        />
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
        {chips.map((chip) => (
          <button
            key={chip.key}
            className={`chip${catFilter === chip.key ? " selected" : ""}`}
            onClick={() => setCatFilter(chip.key)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: 17, color: "var(--color-neutral-700)", padding: "40px 0" }}>
          {t("act.nothing")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {groups.map((g) => (
            <div key={g.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--color-neutral-700)",
                  padding: "0 8px 4px",
                }}
              >
                <span>{g.label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{g.hasCost ? fmt(g.total) : ""}</span>
              </div>
              {g.items.map((item) => (
                <button key={item.tx.id} className="row-btn" onClick={() => openEdit(item.tx)}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span
                      style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {item.merchant}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{item.meta}</span>
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontVariantNumeric: "tabular-nums",
                      color: item.isIncome ? "var(--color-accent-700)" : "inherit",
                    }}
                  >
                    {item.amount}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
