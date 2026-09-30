// Hand-written types mirroring supabase/migrations/0001_init.sql.

export type Role = "owner" | "member";
export type TransactionType = "cost" | "income";
export type IncomeKind = "salary" | "additional";
export type PaymentMethod = "card" | "cash" | "transfer";
export type InviteStatus = "pending" | "accepted" | "revoked";
export type CurrencyCode = "BAM" | "EUR" | "USD" | "GBP" | "CHF";

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string | null;
  base_currency: CurrencyCode;
  monthly_budget: number | null;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: Role;
  invited_by: string | null;
  status: InviteStatus;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  monthly_budget: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  workspace_id: string;
  user_id: string;
  type: TransactionType;
  occurred_on: string; // YYYY-MM-DD
  merchant_or_source: string;
  category_id: string | null;
  income_kind: IncomeKind | null;
  payment_method: PaymentMethod | null;
  amount: number;
  fx_amount: number | null;
  fx_currency: CurrencyCode | null;
  fx_rate: number | null;
  note: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category: Pick<Category, "id" | "name"> | null;
}
