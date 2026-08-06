/** CRADY Intelligence 4.0 — "Why is the yield X%?" Every bullet is gated
 * on a real, checkable threshold from data already on the page; nothing
 * is asserted unconditionally. Mirrors lib/data.ts's
 * computeRunRateAnnualYieldPct methodology in the formula sentence, so
 * the explanation never claims a different method than what actually ran. */

export type YieldExplainInput = {
  annualYieldPct: number | null;
  payoutFrequency: string | null;
  dividendTrend: "up" | "down" | "flat" | null;
  dividendTrendPct: number | null;
  /** ETF's own trailing 30-day price return (RiskMetricsRow.recent_return_30d) — negative means the price fell. */
  recentReturn30d: number | null;
};

export type YieldExplanation = {
  formula: string;
  factors: string[];
};

const LARGE_TREND_PCT = 10;
const NOTABLE_PRICE_DECLINE_PCT = -10;

export function buildYieldExplanation(input: YieldExplainInput, lang: "en" | "ko" = "en"): YieldExplanation | null {
  if (input.annualYieldPct == null) return null;

  const formula =
    lang === "ko"
      ? "최근 90일간 지급된 분배금 합계를 연 단위로 환산한 뒤, 현재 가격으로 나눈 값입니다."
      : "Annualized from the trailing 90 days of paid distributions, divided by the current price.";

  const factors: string[] = [];

  const freq = input.payoutFrequency?.toLowerCase() ?? null;
  if (freq === "weekly") {
    factors.push(
      lang === "ko"
        ? "주간 지급 방식이라 월간·분기 지급 대비 연환산 수치가 더 크게 계산됩니다."
        : "Weekly payouts compound into a higher annualized figure than the same per-payment amount on a monthly or quarterly schedule."
    );
  } else if (freq === "monthly") {
    factors.push(
      lang === "ko"
        ? "월간 지급 방식입니다."
        : "This is a monthly-payout fund."
    );
  }

  if (input.dividendTrend === "up" && input.dividendTrendPct != null && input.dividendTrendPct >= LARGE_TREND_PCT) {
    factors.push(
      lang === "ko"
        ? `최근 분배금이 직전 평균 대비 ${input.dividendTrendPct.toFixed(1)}% 늘어나며 수익률을 끌어올렸습니다.`
        : `Recent distributions have run ${input.dividendTrendPct.toFixed(1)}% above the recent average, pushing the yield up.`
    );
  } else if (input.dividendTrend === "down" && input.dividendTrendPct != null && input.dividendTrendPct <= -LARGE_TREND_PCT) {
    factors.push(
      lang === "ko"
        ? `최근 분배금이 직전 평균 대비 ${Math.abs(input.dividendTrendPct).toFixed(1)}% 줄어들며 수익률을 낮췄습니다.`
        : `Recent distributions have run ${Math.abs(input.dividendTrendPct).toFixed(1)}% below the recent average, pulling the yield down.`
    );
  }

  if (input.recentReturn30d != null && input.recentReturn30d <= NOTABLE_PRICE_DECLINE_PCT) {
    factors.push(
      lang === "ko"
        ? `최근 30일간 가격이 ${Math.abs(input.recentReturn30d).toFixed(1)}% 하락하며, 수익률 계산(분배금 ÷ 가격)을 기계적으로 높였습니다.`
        : `The price has fallen ${Math.abs(input.recentReturn30d).toFixed(1)}% over the past 30 days, which mechanically inflates the yield calculation (yield = distribution ÷ price).`
    );
  } else if (input.recentReturn30d != null && input.recentReturn30d >= -NOTABLE_PRICE_DECLINE_PCT) {
    factors.push(
      lang === "ko"
        ? `최근 30일간 가격이 ${input.recentReturn30d.toFixed(1)}% 상승하며, 수익률 계산을 다소 낮췄습니다.`
        : `The price has risen ${input.recentReturn30d.toFixed(1)}% over the past 30 days, which mechanically tempers the yield calculation.`
    );
  }

  return { formula, factors };
}
