"use client";

import { useState } from "react";
import { exportTransactionsCsv } from "@/app/actions/export";
import { useToast } from "@/lib/toast-context";
import { useT } from "@/lib/i18n/client";

export function ExportCsvButton({ label }: { label?: string }) {
  const { show } = useToast();
  const { t } = useT();
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
    show(t("toast.csv"));
  }

  return (
    <button type="button" className="btn btn-secondary" style={{ minHeight: 44 }} onClick={handleClick} disabled={busy}>
      {busy ? t("export.busy") : (label ?? t("sum.export"))}
    </button>
  );
}
