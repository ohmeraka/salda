"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/locale";
import { useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "bs", label: "Bosanski" },
];

/** Two-option segmented control. Names stay in their own language on purpose. */
export function LanguageSwitcher() {
  const { locale, t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="seg" role="radiogroup" aria-label={t("lang.label")} style={{ opacity: pending ? 0.6 : 1 }}>
      {OPTIONS.map((o) => (
        <label key={o.value} className="seg-opt" style={{ whiteSpace: "nowrap", minHeight: 44, padding: "0 16px" }}>
          <input
            type="radio"
            name="language"
            checked={locale === o.value}
            onChange={() => choose(o.value)}
            disabled={pending}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
