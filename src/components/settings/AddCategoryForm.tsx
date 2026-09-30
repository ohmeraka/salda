"use client";

import { useState } from "react";
import { addCategory } from "@/app/actions/settings";
import { useToast } from "@/lib/toast-context";

export function AddCategoryForm() {
  const { show } = useToast();
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
      setError(result.error || "Couldn't add that category.");
      return;
    }
    setName("");
    show("Category added");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          className="input"
          style={{ minHeight: 44, fontSize: 16 }}
          placeholder="New category"
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
          Add
        </button>
      </div>
      {error && <div style={{ fontSize: 14, color: "var(--color-accent-2-700)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}
