"use client";

import { useState } from "react";
import { exportTransactionsCsv } from "@/app/actions/export";
import { useToast } from "@/lib/toast-context";

export function ExportCsvButton({ label = "Export all costs as CSV" }: { label?: string }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const result = await exportTransactionsCsv();
    setBusy(false);
    if ("error" in result) {
      show(result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "salda-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    show("CSV exported");
  }

  return (
    <button type="button" className="btn btn-secondary" style={{ minHeight: 44 }} onClick={handleClick} disabled={busy}>
      {busy ? "Exporting…" : label}
    </button>
  );
}
