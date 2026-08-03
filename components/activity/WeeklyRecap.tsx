import type { WeeklyRecapReport } from "@/lib/activity/aiOutlook";

const T = {
  heading: { en: "Weekly Recap", ko: "주간 요약" },
  aiGenerated: { en: "AI Generated", ko: "AI 생성" },
  priceMovement: { en: "Price Movement", ko: "가격 움직임" },
  distributionActivity: { en: "Distribution Activity", ko: "배당 활동" },
  forecastChange: { en: "Forecast Change", ko: "예측 변화" },
  investorActivity: { en: "Investor Activity", ko: "투자자 활동" },
  whatToWatch: { en: "What to Watch Next Week", ko: "다음 주 주목할 점" },
} as const;

/** A short, readable weekly report — not a bare stat card. Every section is
 * independently real (lib/activity/aiOutlook.ts's buildWeeklyRecap): a
 * section either states what actually happened, or states plainly that
 * nothing did. Positioned near the bottom of the page, not the top three
 * Activity sections, since it's a recap rather than a "happening now"
 * signal. */
export function WeeklyRecap({ report, lang = "en" }: { report: WeeklyRecapReport; lang?: "en" | "ko" }) {
  const rows: { label: string; value: string | null }[] = [
    { label: T.priceMovement[lang], value: report.priceMovement },
    { label: T.distributionActivity[lang], value: report.distributionActivity },
    { label: T.forecastChange[lang], value: report.forecastChange },
    { label: T.investorActivity[lang], value: report.investorActivity },
    { label: T.whatToWatch[lang], value: report.whatToWatch },
  ].filter((r) => r.value != null);

  return (
    <div className="mt-8 border border-[var(--gray-200)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">{T.heading[lang]}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)] border border-[var(--gray-300)] rounded-full px-2 py-0.5">
          {T.aiGenerated[lang]}
        </span>
      </div>

      <p className="text-sm font-semibold text-[var(--gray-800)] mb-3">{report.oneSentence}</p>

      <dl className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="text-sm">
            <dt className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">{r.label}</dt>
            <dd className="text-[var(--gray-700)] leading-relaxed">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
