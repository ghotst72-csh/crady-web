import { providerLabel, type ComparisonPeer } from "@/lib/data";
import { formatConfidencePct } from "@/lib/confidence";
import type { ArticleData } from "./data";
import type { ArticleTypeId, FaqItem } from "./types";
import { describeTiming, describeTimingKo } from "./timing";

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
  extra?: { peers?: ComparisonPeer[] }
): FaqItem[] {
  const { ticker, prediction, annualYieldPct, risk, payoutFrequency, etf, changeFromLastPct } = data;

  if (type === "next-dividend-prediction") {
    const sixMo = data.trend.find((w) => w.days === 180);
    const twelveMo = data.trend.find((w) => w.days === 365);
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
          ? `CRADY's current confidence score for this ${ticker} prediction is ${formatConfidencePct(prediction.confidence_score, 0)}, based on the consistency of its recent distribution history and, when available, its officially announced payment schedule.`
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
      {
        question: `When did ${ticker} last announce a dividend?`,
        answer: data.latestPaidDistribution?.declaration_date
          ? `${ticker}'s most recent dividend was announced on ${data.latestPaidDistribution.declaration_date}. See the timeline above for how that led to its ex-dividend and payment dates.`
          : `${ticker}'s issuer doesn't always publish a separate announcement date — see the timeline above for its ex-dividend and payment dates instead.`,
      },
      {
        question: `What is ${ticker}'s ex-dividend date?`,
        answer: prediction?.target_ex_date
          ? `${ticker}'s next expected ex-dividend date is ${prediction.target_ex_date}. You must own shares before this date to receive the upcoming payment.`
          : `${ticker}'s next ex-dividend date isn't estimated yet — see the distribution history above for its past ex-dividend dates.`,
      },
      {
        question: `What is ${ticker}'s payment date?`,
        answer: prediction?.target_pay_date
          ? `${ticker}'s next expected payment date is ${prediction.target_pay_date}.`
          : `${ticker}'s next payment date isn't estimated yet.`,
      },
      {
        question: `Is ${ticker} a monthly or weekly dividend ETF?`,
        answer: payoutFrequency
          ? `${ticker} is a ${payoutFrequency} dividend ETF, based on its recent payment cadence.`
          : `${ticker}'s payout cadence hasn't been determined yet from its distribution history.`,
      },
      {
        question: `Is ${ticker}'s next dividend expected this week, next week, this month, or next month?`,
        answer: prediction?.target_pay_date
          ? `${ticker}'s next dividend is expected ${describeTiming(prediction.target_pay_date) ?? "soon"}, on ${prediction.target_pay_date}.`
          : `CRADY doesn't have a forecast date for ${ticker} yet.`,
      },
      {
        question: `What is ${ticker}'s average dividend over the last 6 months?`,
        answer: sixMo && sixMo.count > 0
          ? `${ticker} has made ${sixMo.count} payments over the last 6 months, averaging ${fmtMoney(sixMo.avg)} per share.`
          : `${ticker} doesn't have enough recent payment history for a 6-month average yet.`,
      },
      {
        question: `Has ${ticker}'s dividend increased or decreased over the last year?`,
        answer: twelveMo && twelveMo.count > 1
          ? `Over the last 12 months, ${ticker}'s dividend increased ${twelveMo.increases} time${twelveMo.increases === 1 ? "" : "s"} and decreased ${twelveMo.decreases} time${twelveMo.decreases === 1 ? "" : "s"} across ${twelveMo.count} payments. See the trend table above for the full breakdown.`
          : `${ticker} doesn't have enough payment history over the last 12 months for a trend comparison yet.`,
      },
      {
        question: `Where can I see ${ticker}'s full dividend calendar?`,
        answer: `See the ${ticker} Dividend Calendar for its full published schedule of upcoming ex-dividend and payment dates.`,
      },
      {
        question: `Where can I see ${ticker}'s full dividend history?`,
        answer: `See the ${ticker} Dividend History for a year-by-year breakdown of every recorded payment.`,
      },
      {
        question: `Is ${ticker}'s dividend safe?`,
        answer: risk?.risk_level
          ? `CRADY classifies ${ticker} as ${risk.risk_level.toLowerCase()} risk. See the ${ticker} Risk Analysis for the full breakdown of volatility and dividend stability behind that rating.`
          : `See the ${ticker} Risk Analysis for CRADY's risk assessment once enough data is available.`,
      },
      {
        question: `What ETFs are similar to ${ticker}?`,
        answer: data.siblings.length > 0
          ? `${data.siblings.slice(0, 3).map((s) => s.ticker).join(", ")} are other ${providerLabel(etf.provider_id)} funds tracked by CRADY. See the comparison and related links below for a direct side-by-side.`
          : `See the related links below for other funds tracked by CRADY.`,
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
      {
        question: `How is ${ticker}'s dividend yield calculated?`,
        answer: `CRADY calculates ${ticker}'s annualized distribution yield from a "run-rate": it sums the actual dividends paid over the trailing 90 days, divides by 90 for a daily average, multiplies by 365, and divides by the current share price. This reflects real recent payments, not an issuer's projected yield.`,
      },
      {
        question: `What is ${ticker}'s expense ratio?`,
        answer: etf.expense_ratio && etf.expense_ratio.toLowerCase() !== "unknown"
          ? `${ticker}'s expense ratio is ${etf.expense_ratio}.`
          : `${ticker}'s expense ratio isn't on record yet — check the issuer's official fact sheet for the current figure.`,
      },
      {
        question: `Who manages ${ticker}?`,
        answer: `${ticker} is issued and managed by ${providerLabel(etf.provider_id)}.`,
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
      {
        question: `What is ${ticker}'s maximum drawdown?`,
        answer: risk?.max_drawdown != null
          ? `${ticker}'s recent maximum drawdown is ${fmtPct(risk.max_drawdown)} — the largest peak-to-trough price decline over the measured period.`
          : `Drawdown data isn't available for ${ticker} yet.`,
      },
      {
        question: `What is the CRADY Score?`,
        answer: `The CRADY Score is a 0-100 rating that combines recent price volatility, maximum drawdown, and how consistent an ETF's per-payment dividend amount has been. A high yield alone doesn't raise the score — high volatility or irregular dividends lower it by design.`,
      },
      {
        question: `Why do covered-call ETFs like ${ticker} carry more risk than a typical dividend stock?`,
        answer: `Covered-call ETFs like ${ticker} generate income by selling call options against their holdings, which caps upside participation and can mean distributions include return of capital. That income-generation approach is why they typically show higher volatility scores than traditional dividend-paying stocks.`,
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
      {
        question: `What is the difference between ${ticker}'s ex-dividend date and payment date?`,
        answer: `The ex-dividend date is the cutoff — you must own ${ticker} before this date to receive that period's payment. The payment date is when the distribution is actually deposited, which is typically a few days to a couple of weeks after the ex-dividend date.`,
      },
      {
        question: `How many upcoming ${ticker} payments are on the calendar?`,
        answer: futureSchedule.length > 0
          ? `${futureSchedule.length} upcoming ${ticker} payment date${futureSchedule.length === 1 ? " is" : "s are"} currently published, shown in the schedule above.`
          : `No upcoming ${ticker} payment dates are published yet.`,
      },
    ];
  }

  if (type === "dividend-history") {
    const paid = data.distributionsExtended.filter((d) => d.amount != null);
    const amounts = paid.map((d) => d.amount!);
    return [
      {
        question: `How many dividends has ${ticker} paid?`,
        answer: paid.length > 0
          ? `CRADY has recorded ${paid.length} ${ticker} distributions, broken down by year in the table above.`
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
      {
        question: `What is the highest dividend ${ticker} has ever paid?`,
        answer: amounts.length > 0
          ? `The highest recorded ${ticker} distribution on CRADY is ${fmtMoney(Math.max(...amounts))} per share.`
          : `${ticker}'s payment history isn't on record yet.`,
      },
      {
        question: `How much has ${ticker} paid in total dividends?`,
        answer: amounts.length > 0
          ? `Across its ${amounts.length} recorded payments, ${ticker} has paid a combined ${fmtMoney(amounts.reduce((a, b) => a + b, 0), 2)} per share.`
          : `${ticker}'s payment history isn't on record yet.`,
      },
    ];
  }

  // comparison
  const peers = extra?.peers ?? [];
  if (peers.length === 0) return [];
  const peer = peers[0];
  const groupLabel = peers.map((p) => p.ticker).join(", ");
  return [
    {
      question: peers.length === 1
        ? `Is ${ticker} or ${peer.ticker} the better dividend ETF?`
        : `Which is the better dividend ETF: ${ticker}, ${groupLabel}?`,
      answer: annualYieldPct != null && peer.annualYieldPct != null
        ? `See the side-by-side comparison above for yield, CRADY score, and risk level across all funds shown — "better" depends on whether you prioritize yield or risk profile.`
        : `Compare ${ticker} and ${groupLabel} side-by-side above — "better" depends on whether you prioritize yield or risk profile.`,
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
      question: `Are ${ticker} and ${groupLabel} from the same provider?`,
      answer: `Yes, all are ${providerLabel(etf.provider_id)} funds, which means they share a similar options-income strategy applied to different underlying exposure.`,
    },
    {
      question: `Do ${ticker} and ${peer.ticker} have the same risk level?`,
      answer: risk?.risk_level && peer.riskLevel
        ? risk.risk_level === peer.riskLevel
          ? `Yes, CRADY classifies both ${ticker} and ${peer.ticker} as ${risk.risk_level.toLowerCase()} risk.`
          : `No — CRADY classifies ${ticker} as ${risk.risk_level.toLowerCase()} risk, while ${peer.ticker} is ${peer.riskLevel.toLowerCase()} risk.`
        : `Risk level data isn't fully available for both funds yet — see the comparison table above for what's known.`,
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
  extra?: { peers?: ComparisonPeer[] }
): FaqItem[] {
  const { ticker, prediction, annualYieldPct, risk, payoutFrequency, etf } = data;
  const freqKo = payoutFrequency === "weekly" ? "주간" : payoutFrequency === "monthly" ? "월간" : payoutFrequency;

  if (type === "next-dividend-prediction") {
    const sixMo = data.trend.find((w) => w.days === 180);
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
      {
        question: `${ticker}는 언제 배당을 선언(발표)하나요?`,
        answer: data.latestPaidDistribution?.declaration_date
          ? `${ticker}의 최근 배당 선언일은 ${data.latestPaidDistribution.declaration_date}입니다. 위 타임라인에서 배당락일·지급일로 이어지는 흐름을 확인하세요.`
          : `${ticker}의 발행사는 별도의 선언일을 항상 공개하지는 않습니다 — 위 타임라인의 배당락일·지급일을 참고하세요.`,
      },
      {
        question: `${ticker} 배당락일은 언제인가요?`,
        answer: prediction?.target_ex_date
          ? `${ticker}의 다음 예상 배당락일은 ${prediction.target_ex_date}입니다. 이 날짜 이전에 주식을 보유해야 다음 배당을 받을 수 있습니다.`
          : `${ticker}의 다음 배당락일이 아직 예측되지 않았습니다.`,
      },
      {
        question: `${ticker} 지급일은 언제인가요?`,
        answer: prediction?.target_pay_date
          ? `${ticker}의 다음 예상 지급일은 ${prediction.target_pay_date}입니다.`
          : `${ticker}의 다음 지급일이 아직 예측되지 않았습니다.`,
      },
      {
        question: `${ticker}는 월배당인가요, 주배당인가요?`,
        answer: freqKo
          ? `${ticker}는 최근 지급 주기를 기준으로 ${freqKo} 배당 ETF입니다.`
          : `${ticker}의 배당 주기가 아직 확인되지 않았습니다.`,
      },
      {
        question: `${ticker} 배당은 이번 주, 다음 주, 이번 달, 다음 달 중 언제인가요?`,
        answer: prediction?.target_pay_date
          ? `${ticker}의 다음 배당은 ${describeTimingKo(prediction.target_pay_date) ?? "곧"} (${prediction.target_pay_date}) 지급될 것으로 예상됩니다.`
          : `${ticker}의 다음 지급 예측 데이터가 아직 없습니다.`,
      },
      {
        question: `${ticker}의 최근 6개월 평균 배당금은 얼마인가요?`,
        answer: sixMo && sixMo.count > 0
          ? `${ticker}는 최근 6개월간 ${sixMo.count}회 배당을 지급했으며, 평균 ${fmtMoney(sixMo.avg)}입니다.`
          : `${ticker}의 최근 6개월 배당 데이터가 충분하지 않습니다.`,
      },
      {
        question: `${ticker}와 비슷한 ETF는 무엇인가요?`,
        answer: data.siblings.length > 0
          ? `${data.siblings.slice(0, 3).map((s) => s.ticker).join(", ")} 등이 CRADY가 추적하는 같은 운용사의 ETF입니다. 아래 비교 및 관련 링크를 참고하세요.`
          : `아래 관련 링크에서 CRADY가 추적하는 다른 ETF를 확인하세요.`,
      },
      {
        question: `${ticker} 배당 캘린더는 어디서 볼 수 있나요?`,
        answer: `${ticker}의 전체 예정 배당락일·지급일 일정은 ${ticker} 배당 캘린더 페이지에서 확인할 수 있습니다.`,
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
      {
        question: `${ticker}의 운용사는 어디인가요?`,
        answer: `${ticker}는 ${providerLabel(etf.provider_id)}가 발행 및 운용하는 ETF입니다.`,
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
      {
        question: `CRADY 점수란 무엇인가요?`,
        answer: `CRADY 점수는 최근 가격 변동성, 최대 낙폭(drawdown), 배당금 지급의 일관성을 종합한 0~100점 지표입니다. 배당 수익률이 높다고 점수가 올라가지 않으며, 변동성이 크거나 배당이 불규칙하면 오히려 낮아집니다.`,
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
      {
        question: `배당락일과 지급일의 차이는 무엇인가요?`,
        answer: `배당락일은 해당 배당을 받기 위해 주식을 보유하고 있어야 하는 기준일입니다. 지급일은 실제로 배당금이 입금되는 날짜로, 보통 배당락일로부터 며칠에서 2주 정도 후입니다.`,
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
      {
        question: `${ticker}가 지금까지 지급한 배당금 총액은 얼마인가요?`,
        answer: data.distributionsExtended.filter((d) => d.amount != null).length > 0
          ? `${ticker}는 지금까지 기록된 ${data.distributionsExtended.filter((d) => d.amount != null).length}회의 배당을 통해 주당 총 ${fmtMoney(
              data.distributionsExtended.filter((d) => d.amount != null).reduce((a, d) => a + d.amount!, 0),
              2
            )}를 지급했습니다.`
          : `${ticker}의 배당 지급 기록이 아직 없습니다.`,
      },
    ];
  }

  // comparison
  const peers = extra?.peers ?? [];
  if (peers.length === 0) return [];
  const groupLabel = peers.map((p) => p.ticker).join(", ");
  return [
    {
      question: `${ticker}와 ${groupLabel} 중 어느 쪽 배당 수익률이 더 높나요?`,
      answer: `예상 배당 수익률, CRADY 점수, 위험도 비교는 위 표를 참고하세요.`,
    },
    {
      question: `${ticker}와 ${groupLabel}는 같은 운용사인가요?`,
      answer: `네, 모두 ${providerLabel(etf.provider_id)}가 발행하는 ETF로, 기초자산은 다르지만 유사한 옵션 프리미엄 수익 전략을 사용합니다.`,
    },
  ];
}
