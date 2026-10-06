"use client";

import { useState } from "react";
import { deleteCategory, updateCategoryBudget } from "@/app/actions/settings";
import { useToast } from "@/lib/toast-context";
import { useT } from "@/lib/i18n/client";
import type { CategorySetting } from "@/lib/data/settings";

export function CategoryRow({ category }: { category: CategorySetting }) {
  const { show } = useToast();
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function handleBudgetBlur(e: React.FocusEvent<HTMLInputElement>) {
    const fd = new FormData();
    fd.set("budget", e.target.value);
    const result = await updateCategoryBudget(category.id, fd);
    if ("error" in result) {
      show(result.error);
      return;
    }
    show(t("toast.budget"));
  }

  async function handleDelete() {
    setBusy(true);
    const result = await deleteCategory(category.id);
    setBusy(false);
    if ("error" in result) {
      show(result.error);
      return;
    }
    show(t("toast.categoryRemoved"));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 44px", gap: 10, alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 16 }}>{category.name}</div>
        <div style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{category.spentLabel}</div>
      </div>
      <input
        className="input"
        inputMode="numeric"
        style={{ minHeight: 44, fontSize: 16 }}
        defaultValue={category.budgetValue ?? ""}
        onBlur={handleBudgetBlur}
        aria-label={t("set.monthlyBudgetAria")}
        placeholder={t("set.noLimit")}
      />
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        style={{ width: 44, height: 44, fontSize: 22 }}
        onClick={handleDelete}
        disabled={category.locked || busy}
        aria-label={t("set.removeCat")}
        title={category.locked ? t("set.onlyUnused") : t("set.removeCat")}
      >
        ×
      </button>
    </div>
  );
}
