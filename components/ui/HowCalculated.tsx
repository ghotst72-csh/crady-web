"use client";

import { useState } from "react";

/** CRADY Intelligence 4.0, Item #12 — "How Calculated" button. One shared
 * component wired onto every explainer section (yield, score, risk,
 * prediction estimate, DNA) so methodology disclosure is consistent
 * sitewide rather than bespoke copy per section. `caveats` is where each
 * caller states any honesty caveat specific to that number (e.g. "this
 * reproduces the pipeline's formula for display; it isn't a live call"). */

const T = {
  trigger: { en: "How is this calculated?", ko: "어떻게 계산되나요?" },
  formula: { en: "Formula", ko: "계산식" },
  dataSource: { en: "Data Source", ko: "데이터 출처" },
  caveats: { en: "Notes", ko: "참고 사항" },
} as const;

export function HowCalculated({
  formula,
  dataSource,
  caveats,
  lang = "en",
}: {
  formula: string;
  dataSource: string;
  caveats?: string;
  lang?: "en" | "ko";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[11px] font-semibold text-[#92400e] hover:underline inline-flex items-center gap-1"
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span> {T.trigger[lang]}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] p-3 text-xs text-[var(--gray-600)] space-y-1.5">
          <div>
            <span className="font-semibold text-[var(--gray-700)]">{T.formula[lang]}: </span>
            {formula}
          </div>
          <div>
            <span className="font-semibold text-[var(--gray-700)]">{T.dataSource[lang]}: </span>
            {dataSource}
          </div>
          {caveats && (
            <div>
              <span className="font-semibold text-[var(--gray-700)]">{T.caveats[lang]}: </span>
              {caveats}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
