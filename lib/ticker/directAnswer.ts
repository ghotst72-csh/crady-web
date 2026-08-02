import { providerLabel } from "@/lib/providers";
import { monthYearLabel, monthYearLabelKo } from "@/lib/magazine/timing";

export type DirectAnswerInput = {
  ticker: string;
  providerId: string;
  payoutFrequency: string | null;
  annualYieldPct: number | null;
  prediction: { targetPayDate: string | null; predictedAmount: number | null } | null;
  latestPaidDistribution: { amount: number; payDate: string } | null;
};

/** One short, self-contained sentence, deliberately distinct from (and
 * shorter than) the existing 50-70 *word* buildProfileSnippet paragraph —
 * this is the "direct answer" a search engine or AI system can quote
 * verbatim, so it states one concrete fact and its basis, nothing more.
 * Rendered inside EtfHero, above the yield headline — the single most
 * prominent position on the page. Priority: a real next-dividend
 * prediction > a real last-paid fact > a real yield/identity fact. Never
 * fabricates a forecast when there isn't one. */
export function buildDirectAnswer(input: DirectAnswerInput, lang: "en" | "ko" = "en"): string {
  const { ticker, providerId, payoutFrequency, annualYieldPct, prediction, latestPaidDistribution } = input;

  if (prediction?.targetPayDate) {
    const monthYear = lang === "ko" ? monthYearLabelKo(prediction.targetPayDate) : monthYearLabel(prediction.targetPayDate);
    if (lang === "ko") {
      return `${ticker}의 다음 배당은 과거 지급 패턴과 최근 분배 추세를 근거로 ${
        monthYear ?? prediction.targetPayDate
      } 지급이 예상됩니다.`;
    }
    return `${ticker}'s next dividend is expected ${
      monthYear ? `in ${monthYear}` : `around ${prediction.targetPayDate}`
    } based on historical payment patterns and current distribution trends.`;
  }

  if (latestPaidDistribution?.amount != null) {
    if (lang === "ko") {
      return `${ticker}는 ${latestPaidDistribution.payDate}에 주당 $${latestPaidDistribution.amount.toFixed(4)}를 지급했으며, 다음 배당을 예측할 만큼 충분한 데이터가 아직 없습니다.`;
    }
    return `${ticker} last paid $${latestPaidDistribution.amount.toFixed(4)} per share on ${latestPaidDistribution.payDate}; not enough data yet for a reliable next-dividend forecast.`;
  }

  const provider = providerLabel(providerId);
  if (lang === "ko") {
    return `${ticker}는 ${provider}가 발행하는${payoutFrequency ? ` ${payoutFrequency}` : ""} 배당 ETF입니다${
      annualYieldPct != null ? `, 연환산 예상 분배율 ${annualYieldPct.toFixed(1)}%` : ""
    }.`;
  }
  return `${ticker} is a${payoutFrequency ? ` ${payoutFrequency}` : ""} dividend ETF from ${provider}${
    annualYieldPct != null ? ` with an estimated ${annualYieldPct.toFixed(1)}% annualized yield` : ""
  }.`;
}
