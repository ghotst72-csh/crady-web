import type { TodaysActivitySummaryInput } from "./data";

export type TodaysActivitySummary = {
  headline: string;
  detail: string | null;
};

const T = {
  updates: {
    en: (n: number) => `${n} update${n === 1 ? "" : "s"} today`,
    ko: (n: number) => `오늘 ${n}건의 새 활동`,
  },
  distributionConfirmed: { en: "Distribution confirmed", ko: "배당 확정" },
  newOutlook: { en: "New CRADY outlook", ko: "새 CRADY 분석" },
} as const;

function fmtPriceMove(pct: number, lang: "en" | "ko"): string {
  const sign = pct >= 0 ? "+" : "";
  return lang === "ko" ? `가격 ${sign}${pct.toFixed(1)}%` : `Price ${sign}${pct.toFixed(1)}%`;
}

/** Compact, single-line "Today's Activity" summary for the Hero area — the
 * one place on the page whose whole job is to make Activity's existence
 * impossible to miss without pushing the Hero itself down. Returns null
 * (render nothing) when there is nothing real to report: no invented "0
 * updates today" line, matching the rest of this codebase's honest-empty
 * discipline. Every clause here traces to a real query result — never a
 * fabricated number. */
export function buildTodaysActivitySummary(
  input: TodaysActivitySummaryInput,
  priceDeltaPct: number | null,
  lang: "en" | "ko" = "en"
): TodaysActivitySummary | null {
  if (input.newActivityCount === 0) return null;

  const parts: string[] = [];
  if (input.distributionToday) parts.push(T.distributionConfirmed[lang]);
  if (priceDeltaPct != null && Math.abs(priceDeltaPct) >= 0.1) parts.push(fmtPriceMove(priceDeltaPct, lang));
  if (input.cradyHeadlineToday) parts.push(T.newOutlook[lang]);

  return {
    headline: T.updates[lang](input.newActivityCount),
    detail: parts.length > 0 ? parts.join(" · ") : null,
  };
}
