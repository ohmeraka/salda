"use client";

import { useState } from "react";
import { updateWorkspaceBudget } from "@/app/actions/settings";
import { useToast } from "@/lib/toast-context";
import { useT } from "@/lib/i18n/client";

export function BudgetField({ initialValue, symbol }: { initialValue: number | null; symbol: string }) {
  const { show } = useToast();
  const { t } = useT();
  const [error, setError] = useState("");

  async function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!value) return;
    setError("");
    const fd = new FormData();
    fd.set("budget", value);
    const result = await updateWorkspaceBudget(fd);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    show(t("toast.budget"));
  }

  return (
    <div className="field">
      <label>{t("set.budgetLabel", { symbol })}</label>
      <input
        className="input"
        style={{ minHeight: 44, fontSize: 16, maxWidth: 220 }}
        inputMode="numeric"
        defaultValue={initialValue ?? ""}
        onBlur={handleBlur}
        placeholder={t("set.noLimit")}
      />
      {error && <div style={{ fontSize: 14, color: "var(--color-accent-2-700)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}
