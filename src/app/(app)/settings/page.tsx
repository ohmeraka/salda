import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getWorkspaceCategories } from "@/lib/data/categories";
import { getCategorySettings } from "@/lib/data/settings";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY_SYMBOLS, formatCurrency } from "@/lib/currency";
import { signOut } from "@/app/actions/auth";
import { BudgetField } from "@/components/settings/BudgetField";
import { CategoryRow } from "@/components/settings/CategoryRow";
import { AddCategoryForm } from "@/components/settings/AddCategoryForm";
import { ExportCsvButton } from "@/components/ExportCsvButton";

export default async function SettingsPage() {
  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");
  const { workspace, role } = current;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split("@")[0] ?? "there";

  const categories = await getWorkspaceCategories(workspace.id);
  const categorySettings = await getCategorySettings(workspace.id, categories, workspace.base_currency);
  const budgetTotal = categories.reduce((total, c) => total + (c.monthly_budget ?? 0), 0);

  return (
    <div className="ov-wrap" style={{ maxWidth: 600 }}>
      <div>
        <div className="kicker">Settings</div>
        <h1 className="page-h1">{displayName}</h1>
        <p style={{ color: "var(--color-neutral-700)", margin: "6px 0 0" }}>{user?.email}</p>
      </div>

      <div className="card" style={{ gap: 10 }}>
        <div className="card-title">Household</div>
        <p className="card-body">
          {workspace.name} · {role === "owner" ? "You own this workspace." : "You're a member of this workspace."}
        </p>
        <Link href="/settings/members" className="btn btn-secondary" style={{ minHeight: 44, alignSelf: "flex-start" }}>
          Manage members
        </Link>
      </div>

      <BudgetField initialValue={workspace.monthly_budget} symbol={CURRENCY_SYMBOLS[workspace.base_currency].trim()} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
        <h3 style={{ fontSize: 22, margin: "0 0 8px" }}>Data</h3>
        <ExportCsvButton label="Export CSV" />
      </div>

      <div>
        <h3 style={{ fontSize: 22, margin: "0 0 4px" }}>Categories &amp; budgets</h3>
        <p style={{ fontSize: 14, color: "var(--color-neutral-700)", margin: "0 0 16px" }}>
          Monthly limit per category. Total of limits: {formatCurrency(budgetTotal, workspace.base_currency, 0)}.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categorySettings.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </div>
        <AddCategoryForm />
      </div>

      <div>
        <form action={signOut}>
          <button type="submit" className="btn btn-secondary" style={{ minHeight: 44, padding: "0 24px" }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
