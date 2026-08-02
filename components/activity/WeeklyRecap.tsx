const T = {
  heading: { en: "Weekly Recap", ko: "주간 요약" },
  aiGenerated: { en: "AI Generated", ko: "AI 생성" },
} as const;

/** A rule-based rollup computed at render time (lib/activity/aiOutlook.ts's
 * buildWeeklyRecap) — not a stored/cron artifact. Positioned near the bottom
 * of the page, not in the top three Activity sections, since it's a recap
 * rather than a "this is happening right now" signal. */
export function WeeklyRecap({ text, lang = "en" }: { text: string; lang?: "en" | "ko" }) {
  return (
    <div className="mt-8 border border-[var(--gray-200)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-bold">{T.heading[lang]}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)] border border-[var(--gray-300)] rounded-full px-2 py-0.5">
          {T.aiGenerated[lang]}
        </span>
      </div>
      <p className="text-sm text-[var(--gray-700)] leading-relaxed">{text}</p>
    </div>
  );
}
