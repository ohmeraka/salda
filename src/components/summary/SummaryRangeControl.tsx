"use client";

import { useRouter } from "next/navigation";
import type { SummaryRange } from "@/lib/data/summary";

const RANGES: { value: SummaryRange; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "3 months" },
  { value: "half", label: "6 months" },
];

export function SummaryRangeControl({ range }: { range: SummaryRange }) {
  const router = useRouter();

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
          {r.label}
        </label>
      ))}
    </div>
  );
}
