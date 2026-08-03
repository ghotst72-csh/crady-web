import type { TodaysActivitySummary } from "@/lib/activity/todaysSummary";

const T = {
  cta: { en: "View activity", ko: "활동 보기" },
} as const;

/** The one-line/compact-card presence booster requested for Activity Engine
 * Phase 2 — sits directly under the Hero/KPI row, before any other content,
 * so a visitor can never miss that this ETF has a live activity feed
 * without scrolling. Deliberately a single anchor link to the existing
 * #etf-activity section rather than a second navigation system. Renders
 * nothing when the caller passes null (no real activity today) — the
 * summary itself already guarantees that, this component just respects it. */
export function TodaysActivityCard({
  summary,
  lang = "en",
}: {
  summary: TodaysActivitySummary | null;
  lang?: "en" | "ko";
}) {
  if (!summary) return null;

  return (
    <a
      href="#etf-activity"
      className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 hover:border-black transition-colors group"
    >
      <div className="min-w-0">
        <div className="text-sm font-bold">{summary.headline}</div>
        {summary.detail && (
          <div className="mt-0.5 text-xs text-[var(--gray-500)] truncate">{summary.detail}</div>
        )}
      </div>
      <span className="shrink-0 text-xs font-semibold text-[var(--gray-500)] group-hover:text-black transition-colors">
        {T.cta[lang]} →
      </span>
    </a>
  );
}
