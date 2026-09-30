"use client";

import { createContext, useContext } from "react";
import type { Category, Role, Workspace } from "@/types/database";

interface WorkspaceContextValue {
  workspace: Workspace;
  role: Role;
  userId: string;
  displayName: string;
  categories: Category[];
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}
