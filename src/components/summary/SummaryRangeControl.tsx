"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import type { SummaryRange } from "@/lib/data/summary";

const RANGES: { value: SummaryRange; label: MessageKey }[] = [
  { value: "month", label: "sum.month" },
  { value: "quarter", label: "sum.threeMonths" },
  { value: "half", label: "sum.sixMonths" },
];

export function SummaryRangeControl({ range }: { range: SummaryRange }) {
  const router = useRouter();
  const { t } = useT();

  return (
    <div className="seg">
      {RANGES.map((r) => (
        <label key={r.value} className="seg-opt" style={{ whiteSpace: "nowrap", minHeight: 44, padding: "0 16px" }}>
          <input
            type="radio"
            name="range"
            checked={range === r.value}
            onChange={() => router.push(`/summary?range=${r.value}`)}
          />
          {t(r.label)}
        </label>
      ))}
    </div>
  );
}
