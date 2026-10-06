"use client";

import { useEditor } from "@/lib/editor-context";
import { CloseIcon } from "@/components/icons";
import { ChooseStep } from "@/components/editor/ChooseStep";
import { FormStep } from "@/components/editor/FormStep";
import { useT } from "@/lib/i18n/client";

export function AddEditSheet() {
  const { state, close } = useEditor();
  const { t } = useT();
  if (!state.open) return null;

  const title =
    state.step === "choose"
      ? t("ed.add")
      : state.editing
        ? state.type === "income"
          ? t("ed.editIncome")
          : t("ed.editCost")
        : state.type === "income"
          ? t("ed.newIncome")
          : t("ed.newCost");

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
            aria-label={t("ed.close")}
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
