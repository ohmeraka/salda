"use client";

import { useEditor } from "@/lib/editor-context";
import { ManualIcon, IncomeIcon, ReceiptIcon } from "@/components/icons";

export function ChooseStep() {
  const { chooseManual, chooseIncome } = useEditor();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button type="button" className="choose-row" disabled title="Coming soon — receipt scanning">
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
              Fastest
            </span>
            <span className="tag tag-neutral">Soon</span>
          </span>
          <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>Scan a receipt</span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>
            Photograph it. We read merchant, date and total.
          </span>
        </span>
      </button>

      <button type="button" className="choose-row" onClick={chooseManual}>
        <ManualIcon />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>Enter manually</span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>
            Type in the amount, merchant and category.
          </span>
        </span>
      </button>

      <button type="button" className="choose-row" onClick={chooseIncome}>
        <IncomeIcon />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>Add income</span>
          <span style={{ fontSize: 14, color: "var(--color-neutral-700)" }}>Salary or additional income.</span>
        </span>
      </button>
    </div>
  );
}
