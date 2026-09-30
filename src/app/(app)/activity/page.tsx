import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/workspace";
import { getWorkspaceCategories } from "@/lib/data/categories";
import { getActivityMonth } from "@/lib/data/activity";
import { formatMonthLabel, parseMonthParam, shiftMonth, toMonthParam } from "@/lib/periods";
import { ActivityView } from "@/components/activity/ActivityView";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const current = await getCurrentWorkspace();
  if (!current) redirect("/welcome");
  const { workspace } = current;

  const monthDate = parseMonthParam(params.month);
  const categories = await getWorkspaceCategories(workspace.id);
  const items = await getActivityMonth(workspace.id, monthDate, workspace.base_currency, categories);

  const noNext = toMonthParam(monthDate) >= toMonthParam(new Date());
  const prevHref = `/activity?month=${toMonthParam(shiftMonth(monthDate, -1))}`;
  const nextHref = `/activity?month=${toMonthParam(shiftMonth(monthDate, 1))}`;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="kicker">All costs</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
        <Link
          href={prevHref}
          className="btn btn-ghost btn-icon"
          style={{ width: 44, height: 44, fontSize: 22 }}
          aria-label="Previous month"
        >
          ‹
        </Link>
        <h1 className="page-h1" style={{ flex: 1, textAlign: "center" }}>
          {formatMonthLabel(monthDate)}
        </h1>
        {noNext ? (
          <span
            className="btn btn-ghost btn-icon"
            aria-hidden
            style={{ width: 44, height: 44, fontSize: 22, opacity: 0.45, cursor: "not-allowed" }}
          >
            ›
          </span>
        ) : (
          <Link
            href={nextHref}
            className="btn btn-ghost btn-icon"
            style={{ width: 44, height: 44, fontSize: 22 }}
            aria-label="Next month"
          >
            ›
          </Link>
        )}
      </div>
      <ActivityView items={items} />
    </div>
  );
}
