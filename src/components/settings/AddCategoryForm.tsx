"use client";

import { useState } from "react";
import { addCategory } from "@/app/actions/settings";
import { useToast } from "@/lib/toast-context";
import { useT } from "@/lib/i18n/client";

export function AddCategoryForm() {
  const { show } = useToast();
  const { t } = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("name", name.trim());
    const result = await addCategory(fd);
    setBusy(false);
    if ("error" in result) {
      setError(result.error || t("err.categoryFail"));
      return;
    }
    setName("");
    show(t("toast.categoryAdded"));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          className="input"
          style={{ minHeight: 44, fontSize: 16 }}
          placeholder={t("set.newCategory")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          style={{ minHeight: 44, padding: "0 20px" }}
          onClick={handleAdd}
          disabled={busy}
        >
          {t("set.add")}
        </button>
      </div>
      {error && <div style={{ fontSize: 14, color: "var(--color-accent-2-700)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}
