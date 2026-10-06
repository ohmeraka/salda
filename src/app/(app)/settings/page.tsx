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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getT } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");
  const { workspace, role } = current;

  const translator = await getT();
  const { t, locale } = translator;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split("@")[0] ?? "there";

  const categories = await getWorkspaceCategories(workspace.id);
  const categorySettings = await getCategorySettings(workspace.id, categories, workspace.base_currency, translator);
  const budgetTotal = categories.reduce((total, c) => total + (c.monthly_budget ?? 0), 0);

  return (
    <div className="ov-wrap" style={{ maxWidth: 600 }}>
      <div>
        <div className="kicker">{t("set.kicker")}</div>
        <h1 className="page-h1">{displayName}</h1>
        <p style={{ color: "var(--color-neutral-700)", margin: "6px 0 0" }}>{user?.email}</p>
      </div>

      <div className="card" style={{ gap: 10 }}>
        <div className="card-title">{t("set.household")}</div>
        <p className="card-body">
          {workspace.name} · {role === "owner" ? t("set.owns") : t("set.member")}
        </p>
        <Link href="/settings/members" className="btn btn-secondary" style={{ minHeight: 44, alignSelf: "flex-start" }}>
          {t("set.manage")}
        </Link>
      </div>

      <div className="field">
        <label>{t("lang.label")}</label>
        <LanguageSwitcher />
      </div>

      <BudgetField initialValue={workspace.monthly_budget} symbol={CURRENCY_SYMBOLS[workspace.base_currency].trim()} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
        <h3 style={{ fontSize: 22, margin: "0 0 8px" }}>{t("set.data")}</h3>
        <ExportCsvButton label={t("export.short")} />
      </div>

      <div>
        <h3 style={{ fontSize: 22, margin: "0 0 4px" }}>{t("set.categories")}</h3>
        <p style={{ fontSize: 14, color: "var(--color-neutral-700)", margin: "0 0 16px" }}>
          {t("set.limitsHelp", { total: formatCurrency(budgetTotal, workspace.base_currency, 0, locale) })}
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
            {t("set.signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
