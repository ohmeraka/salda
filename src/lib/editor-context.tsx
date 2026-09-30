"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { TransactionType, TransactionWithCategory } from "@/types/database";

export type EditorState =
  | { open: false }
  | { open: true; step: "choose" }
  | { open: true; step: "form"; type: TransactionType; isNew: boolean; editing: TransactionWithCategory | null };

interface EditorContextValue {
  state: EditorState;
  openAdd: () => void;
  chooseManual: () => void;
  chooseIncome: () => void;
  openEdit: (tx: TransactionWithCategory) => void;
  close: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EditorState>({ open: false });

  const openAdd = useCallback(() => setState({ open: true, step: "choose" }), []);
  const chooseManual = useCallback(
    () => setState({ open: true, step: "form", type: "cost", isNew: true, editing: null }),
    []
  );
  const chooseIncome = useCallback(
    () => setState({ open: true, step: "form", type: "income", isNew: true, editing: null }),
    []
  );
  const openEdit = useCallback(
    (tx: TransactionWithCategory) => setState({ open: true, step: "form", type: tx.type, isNew: false, editing: tx }),
    []
  );
  const close = useCallback(() => setState({ open: false }), []);

  const value = useMemo(
    () => ({ state, openAdd, chooseManual, chooseIncome, openEdit, close }),
    [state, openAdd, chooseManual, chooseIncome, openEdit, close]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within an EditorProvider");
  return ctx;
}
