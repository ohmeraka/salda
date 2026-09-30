"use client";

import { useEditor } from "@/lib/editor-context";
import { CloseIcon } from "@/components/icons";
import { ChooseStep } from "@/components/editor/ChooseStep";
import { FormStep } from "@/components/editor/FormStep";

export function AddEditSheet() {
  const { state, close } = useEditor();
  if (!state.open) return null;

  const title =
    state.step === "choose"
      ? "Add"
      : state.editing
        ? state.type === "income"
          ? "Edit income"
          : "Edit cost"
        : state.type === "income"
          ? "New income"
          : "New cost";

  return (
    <div className="ed-overlay">
      <div className="ed-sheet">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <h2 className="ed-title">{title}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ width: 44, height: 44 }}
            onClick={close}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {state.step === "choose" ? (
          <ChooseStep />
        ) : (
          <FormStep type={state.type} isNew={state.isNew} editing={state.editing} />
        )}
      </div>
    </div>
  );
}
