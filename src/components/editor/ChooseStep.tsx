"use client";

import { useEditor } from "@/lib/editor-context";
import { ManualIcon, IncomeIcon, ReceiptIcon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

export function ChooseStep() {
  const { chooseManual, chooseIncome } = useEditor();
  const { t } = useT();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button type="button" className="choose-row" disabled title={t("ed.scanSoon")}>
        <ReceiptIcon />
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
              }}
            >
              {t("ed.fastest")}
            </span>
            <span className="tag tag-neutral">{t("common.soon")}</span>
          </span>
          <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{t("ed.scan")}</span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>
            {t("ed.scanDesc")}
          </span>
        </span>
      </button>

      <button type="button" className="choose-row" onClick={chooseManual}>
        <ManualIcon />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{t("ed.manual")}</span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>
            {t("ed.manualDesc")}
          </span>
        </span>
      </button>

      <button type="button" className="choose-row" onClick={chooseIncome}>
        <IncomeIcon />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{t("ed.addIncome")}</span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>{t("ed.addIncomeDesc")}</span>
        </span>
      </button>
    </div>
  );
}
