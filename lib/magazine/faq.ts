import { providerLabel, type ComparisonPeer } from "@/lib/data";
import type { ArticleData } from "./data";
import type { ArticleTypeId, FaqItem } from "./types";

function fmtMoney(n: number | null | undefined, digits = 4): string {
  return n != null ? `$${n.toFixed(digits)}` : "not yet available";
}
function fmtPct(n: number | null | undefined, digits = 1): string {
  return n != null ? `${n.toFixed(digits)}%` : "not yet available";
}

/** Data-grounded FAQ per article type. Question sets are strictly
 * non-overlapping across all six types for the same ticker — yield and
 * payout-frequency questions live only on dividend-guide, risk-level
 * questions only on risk-analysis, next-dividend questions only on
 * next-dividend-prediction, schedule/ex-date-timing questions only on
 * dividend-calendar, past-performance questions only on dividend-history,
 * and head-to-head questions only on comparison — so no two of a ticker's
 * pages ever emit the same FAQPage entry. Every answer is derived from the
 * same ArticleData used to render the page, so the JSON-LD is always
 * accurate. */
export function buildFaqItems(
  data: ArticleData,
  type: ArticleTypeId,
  extra?: { peer?: ComparisonPeer | null }
): FaqItem[] {
  const { ticker, prediction, annualYieldPct, risk, payoutFrequency, etf, changeFromLastPct } = data;

  if (type === "next-dividend-prediction") {
    return [
      {
        question: `When is the next ${ticker} dividend?`,
        answer: prediction?.target_pay_date
          ? `CRADY estimates the next ${ticker} dividend will be paid on ${prediction.target_pay_date}, with an ex-dividend date of ${prediction.target_ex_date ?? "TBD"}.`
          : `CRADY doesn't have enough recent data to estimate ${ticker}'s next dividend date yet. Check the distribution history section above for its past payment pattern.`,
      },
      {
        question: `What is the predicted ${ticker} dividend amount?`,
        answer: prediction?.predicted_amount != null
          ? `The estimated next ${ticker} dividend amount is ${fmtMoney(prediction.predicted_amount)} per share, based on its recent distribution history.`
          : `A predicted amount isn't available yet for ${ticker}.`,
      },
      {
        question: `How accurate is the CRADY prediction for ${ticker}?`,
        answer: prediction?.confidence_score != null
          ? `CRADY's current confidence score for this ${ticker} prediction is ${fmtPct(prediction.confidence_score, 0)}, based on the consistency of its recent distribution history and, when available, its officially announced payment schedule.`
          : `CRADY assigns a confidence score to each prediction based on distribution history consistency, but none is available for ${ticker} yet.`,
      },
      {
        question: `How is the next ${ticker} dividend estimated?`,
        answer: `CRADY estimates the next dividend by combining ${ticker}'s officially announced distribution schedule (when published by ${providerLabel(etf.provider_id)}) with a weighted average of its most recent actual payments. Estimates are never guessed for ETFs without enough payment history.`,
      },
      {
        question: `Has the ${ticker} dividend prediction changed recently?`,
        answer: prediction?.predicted_amount != null && changeFromLastPct != null
          ? `${ticker}'s currently predicted amount is ${changeFromLastPct >= 0 ? "up" : "down"} ${Math.abs(changeFromLastPct).toFixed(1)}% compared to its last actual payment.`
          : `There isn't enough data yet to compare ${ticker}'s predicted amount to its payment trend.`,
      },
    ];
  }

  if (type === "dividend-guide") {
    return [
      {
        question: `What is ${ticker}'s dividend yield?`,
        answer: annualYieldPct != null
          ? `${ticker}'s estimated annualized distribution yield is ${fmtPct(annualYieldPct)}, based on its trailing 90-day payment run-rate.`
          : `${ticker}'s dividend yield can't be estimated yet due to limited price or distribution data.`,
      },
      {
        question: `How often does ${ticker} pay dividends?`,
        answer: payoutFrequency
          ? `${ticker} pays distributions on a ${payoutFrequency} schedule.`
          : `${ticker}'s payout frequency hasn't been determined yet from its distribution history.`,
      },
      {
        question: `What does ${ticker} invest in?`,
        answer: etf.investment_strategy
          ? etf.investment_strategy
          : etf.asset_class
            ? `${ticker} is a ${providerLabel(etf.provider_id)} ${etf.asset_class} fund.`
            : `${ticker} is issued by ${providerLabel(etf.provider_id)}. See the overview above for available details.`,
      },
    ];
  }

  if (type === "risk-analysis") {
    return [
      {
        question: `Is ${ticker} a risky investment?`,
        answer: risk?.risk_level
          ? `CRADY classifies ${ticker} as ${risk.risk_level.toLowerCase()} risk, with a CRADY score of ${risk.crady_score?.toFixed(1) ?? "—"}/100. This reflects recent volatility and dividend stability, not a guarantee of future performance.`
          : `Risk data isn't available for ${ticker} yet.`,
      },
      {
        question: `How volatile is ${ticker}?`,
        answer: risk?.volatility_30d != null
          ? `${ticker}'s 30-day volatility is ${fmtPct(risk.volatility_30d)}${
              risk.max_drawdown != null ? `, with a recent maximum drawdown of ${fmtPct(risk.max_drawdown)}` : ""
            }.`
          : `Volatility data isn't available for ${ticker} yet.`,
      },
      {
        question: `How stable is ${ticker}'s dividend?`,
        answer: risk?.dividend_stability_score != null
          ? `${ticker} has a dividend stability score of ${risk.dividend_stability_score.toFixed(1)}/100, based on how consistent its distribution amount has been across recent payments.`
          : `Dividend stability data isn't available for ${ticker} yet.`,
      },
    ];
  }

  if (type === "dividend-calendar") {
    const { futureSchedule } = data;
    return [
      {
        question: `Does ${ticker} have a published dividend calendar?`,
        answer: futureSchedule.length > 0
          ? `Yes — ${providerLabel(etf.provider_id)} has published ${futureSchedule.length} upcoming ${ticker} payment date${futureSchedule.length === 1 ? "" : "s"}, listed in the schedule above.`
          : `${ticker}'s issuer hasn't published a forward payment schedule yet — check the distribution history for its typical pattern instead.`,
      },
      {
        question: `Should I buy ${ticker} before the ex-dividend date?`,
        answer: `You must own ${ticker} before its ex-dividend date to receive that period's payment. Buying on or after the ex-date means you'll receive the following distribution instead. This isn't personalized investment advice.`,
      },
      {
        question: `Is ${ticker} a weekly or monthly dividend ETF?`,
        answer: payoutFrequency
          ? `${ticker} pays on a ${payoutFrequency} schedule, which is reflected in the spacing of the dates in its calendar above.`
          : `${ticker}'s payout cadence hasn't been determined yet from its distribution history.`,
      },
    ];
  }

  if (type === "dividend-history") {
    const paidCount = data.distributionsExtended.filter((d) => d.amount != null).length;
    return [
      {
        question: `How many dividends has ${ticker} paid?`,
        answer: paidCount > 0
          ? `CRADY has recorded ${paidCount} ${ticker} distributions, broken down by year in the table above.`
          : `CRADY doesn't have a recorded payment history for ${ticker} yet.`,
      },
      {
        question: `What was ${ticker}'s previous dividend?`,
        answer: data.latestPaidDistribution?.amount != null
          ? `${ticker}'s most recent recorded distribution was ${fmtMoney(data.latestPaidDistribution.amount)} per share, paid on ${data.latestPaidDistribution.pay_date}.`
          : `${ticker}'s most recent distribution isn't on record yet.`,
      },
      {
        question: `Has ${ticker}'s dividend grown or shrunk over time?`,
        answer: `See the year-by-year breakdown above for how ${ticker}'s total distributions have trended across years. Option-income ETFs like ${ticker} typically fluctuate with market volatility rather than growing steadily like a traditional dividend stock.`,
      },
    ];
  }

  // comparison
  const peer = extra?.peer;
  if (!peer) return [];
  return [
    {
      question: `Is ${ticker} or ${peer.ticker} the better dividend ETF?`,
      answer: annualYieldPct != null && peer.annualYieldPct != null
        ? `${annualYieldPct > peer.annualYieldPct ? ticker : peer.ticker} currently has the higher estimated yield. See the side-by-side comparison above for yield, CRADY score, and risk level.`
        : `Compare ${ticker} and ${peer.ticker} side-by-side above — "better" depends on whether you prioritize yield or risk profile.`,
    },
    {
      question: `Do ${ticker} and ${peer.ticker} pay on the same schedule?`,
      answer: payoutFrequency && peer.payoutFrequency
        ? payoutFrequency === peer.payoutFrequency
          ? `Yes, both ${ticker} and ${peer.ticker} pay on a ${payoutFrequency} schedule.`
          : `No — ${ticker} pays ${payoutFrequency} while ${peer.ticker} pays ${peer.payoutFrequency}.`
        : `Payout frequency data isn't fully available for both funds yet.`,
    },
    {
      question: `Are ${ticker} and ${peer.ticker} from the same provider?`,
      answer: `Yes, both are ${providerLabel(etf.provider_id)} funds, which means they share a similar options-income strategy applied to different underlying exposure.`,
    },
  ];
}

const KO_RISK_LABEL: Record<string, string> = {
  SAFE: "안전",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "매우 위험",
};

/** Korean-language FAQ, generated from the same ArticleData — serves the
 * Korean search queries CRADY targets (다음 배당, 배당일, 배당락일, 지급일,
 * 배당금 예상, 배당 캘린더 등) as real on-page content, not a translated
 * duplicate of the English set (different question framing per type, same
 * non-overlap rule across types as the English FAQ). */
export function buildFaqItemsKo(
  data: ArticleData,
  type: ArticleTypeId,
  extra?: { peer?: ComparisonPeer | null }
): FaqItem[] {
  const { ticker, prediction, annualYieldPct, risk, payoutFrequency, etf } = data;
  const freqKo = payoutFrequency === "weekly" ? "주간" : payoutFrequency === "monthly" ? "월간" : payoutFrequency;

  if (type === "next-dividend-prediction") {
    return [
      {
        question: `${ticker} 다음 배당일은 언제인가요?`,
        answer: prediction?.target_pay_date
          ? `CRADY 예측에 따르면 ${ticker}의 다음 배당 지급일은 ${prediction.target_pay_date}이며, 배당락일은 ${prediction.target_ex_date ?? "미정"}입니다.`
          : `${ticker}의 다음 배당일을 예측할 만큼 충분한 최근 데이터가 아직 없습니다.`,
      },
      {
        question: `${ticker} 예상 배당금은 얼마인가요?`,
        answer: prediction?.predicted_amount != null
          ? `CRADY가 예측한 ${ticker}의 다음 배당금은 주당 ${fmtMoney(prediction.predicted_amount)}입니다.`
          : `${ticker}의 예상 배당금 데이터가 아직 준비되지 않았습니다.`,
      },
    ];
  }

  if (type === "dividend-guide") {
    return [
      {
        question: `${ticker} 배당 수익률은 얼마인가요?`,
        answer: annualYieldPct != null
          ? `${ticker}의 최근 90일 배당 기준 연환산 예상 수익률은 약 ${fmtPct(annualYieldPct)}입니다.`
          : `${ticker}의 배당 수익률을 계산할 데이터가 아직 충분하지 않습니다.`,
      },
      {
        question: `${ticker} 배당금은 얼마나 자주 지급되나요?`,
        answer: freqKo
          ? `${ticker}는 ${freqKo} 배당을 지급합니다.`
          : `${ticker}의 배당 지급 주기가 아직 확인되지 않았습니다.`,
      },
    ];
  }

  if (type === "risk-analysis") {
    if (!risk?.risk_level) return [];
    return [
      {
        question: `${ticker}는 안전한 투자처인가요?`,
        answer: `CRADY는 ${ticker}를 ${KO_RISK_LABEL[risk.risk_level] ?? risk.risk_level} 등급으로 분류하며, CRADY 점수는 ${risk.crady_score?.toFixed(1) ?? "—"}/100입니다.`,
      },
    ];
  }

  if (type === "dividend-calendar") {
    return [
      {
        question: `${ticker} 배당 캘린더에서 다음 배당락일은 언제인가요?`,
        answer: data.futureSchedule.length > 0
          ? `${providerLabel(etf.provider_id)}가 발표한 ${ticker}의 다음 배당락일은 ${data.futureSchedule[0].ex_date}, 지급일은 ${data.futureSchedule[0].pay_date}입니다.`
          : `${ticker}의 발표된 배당 일정이 아직 없습니다.`,
      },
      {
        question: `${ticker}는 이번 주 또는 다음 주에 배당을 지급하나요?`,
        answer: `${ticker}의 향후 배당 일정은 위 캘린더 표를 참고하세요. 지급일이 임박한 배당은 CRADY 홈페이지의 이번 주 배당 섹션에서도 확인할 수 있습니다.`,
      },
    ];
  }

  if (type === "dividend-history") {
    return [
      {
        question: `${ticker}의 지난 배당금은 얼마였나요?`,
        answer: data.latestPaidDistribution?.amount != null
          ? `${ticker}의 가장 최근 배당금은 주당 ${fmtMoney(data.latestPaidDistribution.amount)}였으며, 지급일은 ${data.latestPaidDistribution.pay_date}입니다.`
          : `${ticker}의 배당 지급 기록이 아직 없습니다.`,
      },
    ];
  }

  // comparison
  const peer = extra?.peer;
  if (!peer) return [];
  return [
    {
      question: `${ticker}와 ${peer.ticker} 중 어느 쪽 배당 수익률이 더 높나요?`,
      answer: annualYieldPct != null && peer.annualYieldPct != null
        ? `${annualYieldPct > peer.annualYieldPct ? ticker : peer.ticker}의 예상 배당 수익률이 더 높습니다. 자세한 비교는 위 표를 참고하세요.`
        : `두 종목의 배당 수익률 비교는 위 표를 참고하세요.`,
    },
  ];
}
