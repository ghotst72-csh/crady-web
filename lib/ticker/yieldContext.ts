/** ETF Detail Page v3 — requirement #6: the bare "74.5%" yield number gets
 * real context instead of sitting alone. Computed purely from the site's
 * own already-fetched sitewide yield data (getHomeSnapshot), never a
 * fabricated or hardcoded tier — a young/thin dataset simply returns null
 * (honest omission) rather than a made-up percentile. */

export type YieldTier = "top5" | "top10" | "top25" | "above_average" | "below_average";

export type YieldPercentileResult = {
  tier: YieldTier;
  label: string;
};

/** Below this sample size, a "Top N%" claim isn't statistically meaningful
 * — omit the badge entirely rather than imply precision the data can't
 * support. */
const MIN_SAMPLE_SIZE = 10;

const TIER_LABEL: Record<YieldTier, Record<"en" | "ko", string>> = {
  top5: { en: "Top 5% among covered-call ETFs", ko: "커버드콜 ETF 중 상위 5%" },
  top10: { en: "Top 10% among covered-call ETFs", ko: "커버드콜 ETF 중 상위 10%" },
  top25: { en: "Top 25% among covered-call ETFs", ko: "커버드콜 ETF 중 상위 25%" },
  above_average: { en: "Above average yield", ko: "평균 이상 분배율" },
  below_average: { en: "Below average yield", ko: "평균 이하 분배율" },
};

function tierFor(pctBeatenBy: number): YieldTier {
  if (pctBeatenBy <= 5) return "top5";
  if (pctBeatenBy <= 10) return "top10";
  if (pctBeatenBy <= 25) return "top25";
  if (pctBeatenBy <= 50) return "above_average";
  return "below_average";
}

/** `allYieldsPct` should be the sitewide set of known annualYieldPct values
 * (this ticker's own value may or may not be included — either is fine). */
export function computeYieldPercentile(
  tickerYieldPct: number | null,
  allYieldsPct: (number | null)[],
  lang: "en" | "ko" = "en"
): YieldPercentileResult | null {
  if (tickerYieldPct == null) return null;
  const valid = allYieldsPct.filter((y): y is number => y != null && Number.isFinite(y));
  if (valid.length < MIN_SAMPLE_SIZE) return null;

  const beatenByCount = valid.filter((y) => y > tickerYieldPct).length;
  const pctBeatenBy = (beatenByCount / valid.length) * 100;
  const tier = tierFor(pctBeatenBy);
  return { tier, label: TIER_LABEL[tier][lang] };
}
