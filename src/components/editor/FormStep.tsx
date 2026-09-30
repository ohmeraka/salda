"use client";

import { useState } from "react";
import { useEditor } from "@/lib/editor-context";
import { useWorkspace } from "@/lib/workspace-context";
import { useToast } from "@/lib/toast-context";
import { createTransaction, deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import { getExchangeRate } from "@/app/actions/fx";
import { CURRENCIES, CURRENCY_SYMBOLS, formatCurrency } from "@/lib/currency";
import { toDateParam } from "@/lib/periods";
import type { CurrencyCode, IncomeKind, PaymentMethod, TransactionType, TransactionWithCategory } from "@/types/database";

const INCOME_KINDS: { value: IncomeKind; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "additional", label: "Additional income" },
];
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
];

export function FormStep({
  type: initialType,
  isNew,
  editing,
}: {
  type: TransactionType;
  isNew: boolean;
  editing: TransactionWithCategory | null;
}) {
  const { close } = useEditor();
  const { categories, workspace } = useWorkspace();
  const { show: showToast } = useToast();

  const [type, setType] = useState<TransactionType>(editing?.type ?? initialType);
  const [amount, setAmount] = useState(() =>
    editing ? (editing.fx_amount ?? editing.amount).toFixed(2) : ""
  );
  const [currency, setCurrency] = useState<CurrencyCode>(editing?.fx_currency ?? workspace.base_currency);
  const [fxRate, setFxRate] = useState(editing?.fx_rate != null ? String(editing.fx_rate) : "");
  const [merchant, setMerchant] = useState(editing?.merchant_or_source ?? "");
  const [date, setDate] = useState(editing?.occurred_on ?? toDateParam(new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? categories[0]?.id ?? null);
  const [incomeKind, setIncomeKind] = useState<IncomeKind>(editing?.income_kind ?? "salary");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editing?.payment_method ?? "card");
  const [note, setNote] = useState(editing?.note ?? "");
  const [isRecurring, setIsRecurring] = useState(editing?.is_recurring ?? false);

  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; merchant?: string; date?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  const isEdit = !!editing;
  const isIncome = type === "income";
  const foreignCurrency = currency !== workspace.base_currency;
  const amountNum = parseFloat(amount.replace(",", "."));
  const rateNum = parseFloat(fxRate.replace(",", "."));
  const hasConversion = foreignCurrency && amountNum > 0 && rateNum > 0;

  async function fetchRate(cur: CurrencyCode) {
    setRateLoading(true);
    const result = await getExchangeRate(cur, workspace.base_currency);
    setRateLoading(false);
    if ("rate" in result) setFxRate(result.rate.toFixed(4));
  }

  function handleCurrencyChange(next: CurrencyCode) {
    setCurrency(next);
    if (next === workspace.base_currency) {
      setFxRate("");
      return;
    }
    // Editing an existing foreign-currency entry keeps its stored historical
    // rate until the person explicitly asks to refresh it.
    if (!isEdit) void fetchRate(next);
  }

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!(amountNum > 0)) errs.amount = "Enter an amount above 0";
    if (!merchant.trim()) {
      errs.merchant = isIncome ? "Add a source, e.g. your employer" : "Add a merchant or short description";
    }
    if (!date) errs.date = "Pick a date";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    setFormError("");
    if (!validate()) return;
    if (foreignCurrency && !(rateNum > 0)) {
      setFormError(`Enter the exchange rate (1 ${currency} = ? ${workspace.base_currency})`);
      return;
    }

    const fd = new FormData();
    fd.set("type", type);
    fd.set("amount", amount);
    fd.set("currency", currency);
    if (foreignCurrency) fd.set("fxRate", fxRate);
    fd.set("merchant", merchant.trim());
    fd.set("date", date);
    if (isIncome) {
      fd.set("incomeKind", incomeKind);
    } else {
      if (categoryId) fd.set("categoryId", categoryId);
      fd.set("paymentMethod", paymentMethod);
    }
    fd.set("note", note.trim());
    if (isRecurring) fd.set("isRecurring", "on");

    setBusy(true);
    const result = editing ? await updateTransaction(editing.id, fd) : await createTransaction(fd);
    setBusy(false);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    showToast(result.toast);
    close();
  }

  async function handleDelete() {
    if (!editing) return;
    setBusy(true);
    const result = await deleteTransaction(editing.id);
    setBusy(false);
    setConfirmDelete(false);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    showToast(result.toast);
    close();
  }

  const convertedPreview = hasConversion
    ? `≈ ${formatCurrency(amountNum * rateNum, workspace.base_currency)} · 1 ${currency} = ${rateNum.toFixed(2)} ${workspace.base_currency}`
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        {isNew && (
          <div className="seg" style={{ marginBottom: 18 }}>
            <label className="seg-opt" style={{ whiteSpace: "nowrap" }}>
              <input type="radio" name="entrytype" checked={type === "cost"} onChange={() => setType("cost")} />
              Cost
            </label>
            <label className="seg-opt" style={{ whiteSpace: "nowrap" }}>
              <input type="radio" name="entrytype" checked={type === "income"} onChange={() => setType("income")} />
              Income
            </label>
          </div>
        )}

        <div className="ed-amount-row">
          <span className="ed-amount-sym">{CURRENCY_SYMBOLS[currency]}</span>
          <input
            className="ed-amount-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            aria-label="Amount"
          />
        </div>
        {fieldErrors.amount && (
          <div style={{ fontSize: 14, color: "var(--color-accent-2-700)", marginTop: 4 }}>{fieldErrors.amount}</div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <select
            className="input"
            style={{ width: "auto", minHeight: 44, fontSize: 15 }}
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            aria-label="Currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {foreignCurrency && (
            <>
              <input
                className="input"
                style={{ width: 140, minHeight: 44, fontSize: 15 }}
                inputMode="decimal"
                value={rateLoading ? "…" : fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                disabled={rateLoading}
                placeholder={`1 ${currency} = ?`}
                aria-label={`Exchange rate, 1 ${currency} to ${workspace.base_currency}`}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ minHeight: 44, fontSize: 13, padding: "0 4px" }}
                onClick={() => fetchRate(currency)}
                disabled={rateLoading}
              >
                {rateLoading ? "Fetching…" : "Use current rate"}
              </button>
            </>
          )}
        </div>
        {hasConversion && (
          <div style={{ fontSize: 14, color: "var(--color-neutral-700)", marginTop: 6 }}>{convertedPreview}</div>
        )}
      </div>

      <div className="field">
        <label>{isIncome ? "Source" : "Merchant"}</label>
        <input
          className="input"
          style={{ minHeight: 44, fontSize: 16 }}
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder={isIncome ? "Employer or client" : "Where did you spend?"}
        />
        {fieldErrors.merchant && (
          <div style={{ fontSize: 14, color: "var(--color-accent-2-700)", marginTop: 4 }}>{fieldErrors.merchant}</div>
        )}
      </div>

      <div className="field">
        <label>Date</label>
        <input
          className="input"
          style={{ fontSize: 16 }}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {fieldErrors.date && (
          <div style={{ fontSize: 14, color: "var(--color-accent-2-700)", marginTop: 4 }}>{fieldErrors.date}</div>
        )}
      </div>

      <div className="field">
        <label>{isIncome ? "Type" : "Category"}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {isIncome
            ? INCOME_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  className={`chip${incomeKind === k.value ? " selected" : ""}`}
                  onClick={() => setIncomeKind(k.value)}
                >
                  {k.label}
                </button>
              ))
            : categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip${categoryId === c.id ? " selected" : ""}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
        </div>
      </div>

      {!isIncome && (
        <div className="field">
          <label>Paid with</label>
          <div className="seg">
            {PAYMENT_METHODS.map((p) => (
              <label key={p.value} className="seg-opt" style={{ whiteSpace: "nowrap" }}>
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === p.value}
                  onChange={() => setPaymentMethod(p.value)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label>Note (optional)</label>
        <input
          className="input"
          style={{ minHeight: 44, fontSize: 16 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything to remember"
        />
      </div>

      <label className="radio" style={{ minHeight: 44, fontSize: 16 }}>
        <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
        <span className="dot" style={{ borderRadius: 2 }} />
        {isIncome ? "Repeats every month (e.g. salary)" : "Repeats every month"}
      </label>

      {formError && <div style={{ fontSize: 14, color: "var(--color-accent-2-700)" }}>{formError}</div>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: 48, padding: "0 28px", fontSize: 16 }}
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : isIncome ? "Save income" : "Save cost"}
        </button>
        <button type="button" className="btn btn-secondary" style={{ minHeight: 48 }} onClick={close} disabled={busy}>
          Cancel
        </button>
        {isEdit && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: 48, marginLeft: "auto", color: "var(--color-accent-2-700)" }}
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Delete
          </button>
        )}
      </div>

      {confirmDelete && editing && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <div className="dialog-title">Delete this entry?</div>
            <div className="dialog-body">
              {editing.merchant_or_source} ({formatCurrency(editing.amount, workspace.base_currency)}) will be
              removed from your totals. This can&apos;t be undone.
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 44 }}
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
              >
                Keep
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: 44, background: "var(--color-accent-2-600)" }}
                onClick={handleDelete}
                disabled={busy}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
