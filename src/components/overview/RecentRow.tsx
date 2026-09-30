"use client";

import { useEditor } from "@/lib/editor-context";
import type { Transaction, TransactionWithCategory } from "@/types/database";

export function RecentRow({
  tx,
  categoryName,
  meta,
  amount,
}: {
  tx: Transaction;
  categoryName: string | null;
  meta: string;
  amount: string;
}) {
  const { openEdit } = useEditor();

  const withCategory: TransactionWithCategory = {
    ...tx,
    category: tx.category_id ? { id: tx.category_id, name: categoryName ?? "" } : null,
  };

  return (
    <button className="row-btn" onClick={() => openEdit(withCategory)}>
      <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 16,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tx.merchant_or_source}
        </span>
        <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{meta}</span>
      </span>
      <span style={{ fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{amount}</span>
    </button>
  );
}
