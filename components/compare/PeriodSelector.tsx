"use client";

import type { ComparePeriodPreset } from "@/lib/compare/period";

const PRESETS: ComparePeriodPreset[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"];

const T = {
  label: { en: "Comparison Period", ko: "비교 기간" },
  custom: { en: "Custom", ko: "직접 설정" },
  from: { en: "From", ko: "시작일" },
  to: { en: "To", ko: "종료일" },
} as const;

export type PeriodSelectorValue = { preset: ComparePeriodPreset | "custom"; customStart: string; customEnd: string };

export function PeriodSelector({
  value,
  onChange,
  todayIso,
  lang = "en",
}: {
  value: PeriodSelectorValue;
  onChange: (next: PeriodSelectorValue) => void;
  todayIso: string;
  lang?: "en" | "ko";
}) {
  return (
    <div>
      <div className="text-xs font-bold text-[var(--gray-900)] mb-2">{T.label[lang]}</div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...value, preset: p })}
            className={`px-3.5 py-2 rounded-full text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              value.preset === p
                ? "bg-blue-600 text-white"
                : "bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...value, preset: "custom" })}
          className={`px-3.5 py-2 rounded-full text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            value.preset === "custom"
              ? "bg-blue-600 text-white"
              : "bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]"
          }`}
        >
          {T.custom[lang]}
        </button>
      </div>

      {value.preset === "custom" && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className="block font-semibold text-[var(--gray-600)] mb-1">{T.from[lang]}</span>
            <input
              type="date"
              value={value.customStart}
              max={value.customEnd || todayIso}
              onChange={(e) => onChange({ ...value, customStart: e.target.value })}
              className="rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-xs">
            <span className="block font-semibold text-[var(--gray-600)] mb-1">{T.to[lang]}</span>
            <input
              type="date"
              value={value.customEnd}
              min={value.customStart}
              max={todayIso}
              onChange={(e) => onChange({ ...value, customEnd: e.target.value })}
              className="rounded-lg border border-[var(--gray-200)] px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </div>
      )}
    </div>
  );
}
