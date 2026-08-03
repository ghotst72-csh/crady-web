import { providerLabel } from "@/lib/providers";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "low", NORMAL: "moderate", RISKY: "elevated", EXTREME: "very high" },
  ko: { SAFE: "낮은", NORMAL: "보통", RISKY: "높은", EXTREME: "매우 높은" },
};

const CONFIDENCE_LEVEL = {
  low: { en: "low", ko: "낮음" },
  building: { en: "early signals", ko: "초기 신호" },
  moderate: { en: "moderate", ko: "보통" },
  established: { en: "established", ko: "충분함" },
} as const;

export type AiOutlookInput = {
  ticker: string;
  providerId: string;
  priceDeltaPct: number | null;
  riskLevel: string | null;
  cradyScore: number | null;
  maxDrawdownPct: number | null;
  volatility30dPct: number | null;
  annualYieldPct: number | null;
  dividendTrendPct: number | null;
  latestPaidDistribution: { amount: number; payDate: string } | null;
  prediction: {
    targetPayDate: string | null;
    targetExDate: string | null;
    predictedAmount: number | null;
    confidenceScore: number | null;
    predictionMethod: string | null;
  } | null;
  mostDiscussed: { title: string; replyCount: number } | null;
  activitySignals: { questionCount: number; totalComments: number; voteCount: number };
};

export type AiOutlook = {
  todaysOutlook: string;
  bullCase: string;
  bearCase: string;
  biggestRisk: string;
  dividendConfidence: string;
  whatInvestorsAreWatching: string;
  upcomingCatalyst: string;
};

export type ActivityConfidence = {
  level: "low" | "building" | "moderate" | "established";
  label: string;
};

function fmtPct(n: number | null | undefined, lang: "en" | "ko"): string {
  if (n == null) return lang === "ko" ? "데이터 없음" : "no data";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}
function fmtMoney(n: number | null | undefined): string {
  return n != null ? `$${n.toFixed(4)}` : "—";
}

/** Rule-based, template-generated — the same category of "AI" content the
 * site's existing buildProfileSnippet (lib/ticker/profileSeo.ts) already
 * uses, not a live LLM call. Every subsection has an explicit real-data path
 * and an honest "not enough data" fallback; none is ever left blank. */
export function buildAiOutlook(input: AiOutlookInput, lang: "en" | "ko" = "en"): AiOutlook {
  const {
    ticker,
    providerId,
    priceDeltaPct,
    riskLevel,
    cradyScore,
    maxDrawdownPct,
    annualYieldPct,
    dividendTrendPct,
    prediction,
    mostDiscussed,
  } = input;
  const provider = providerLabel(providerId);
  const riskLabel = riskLevel ? (RISK_LABEL[lang][riskLevel] ?? riskLevel) : null;

  if (lang === "ko") {
    return {
      todaysOutlook: [
        priceMoveKo(ticker, priceDeltaPct),
        cradyScore != null && riskLabel
          ? `CRADY 점수 ${cradyScore.toFixed(1)}, 위험도는 ${riskLabel} 수준입니다.`
          : "위험 지표가 아직 충분하지 않습니다.",
      ].join(" "),
      bullCase:
        annualYieldPct != null
          ? `연환산 분배율 ${fmtPct(annualYieldPct, "ko")}는 ${provider} 계열 내에서 참고할 만한 수치입니다${
              dividendTrendPct != null && dividendTrendPct >= 0 ? ", 최근 배당 추세도 견조합니다." : "."
            }`
          : "긍정적으로 판단할 실지급 데이터가 아직 충분하지 않습니다.",
      bearCase:
        maxDrawdownPct != null
          ? `과거 최대 낙폭이 ${fmtPct(maxDrawdownPct, "ko")}로, 이 정도의 변동성이 분배율의 대가일 수 있습니다.`
          : dividendTrendPct != null && dividendTrendPct < 0
            ? `최근 배당 추세가 ${fmtPct(dividendTrendPct, "ko")}로 감소하는 흐름입니다.`
            : "변동성 데이터가 아직 충분하지 않습니다.",
      biggestRisk: riskLabel
        ? `현재 위험도는 ${riskLabel} 수준으로 분류됩니다${
            maxDrawdownPct != null ? ` (최대 낙폭 ${fmtPct(maxDrawdownPct, "ko")}).` : "."
          }`
        : "위험도 데이터가 아직 계산되지 않았습니다.",
      dividendConfidence:
        prediction?.predictedAmount != null && prediction.confidenceScore != null
          ? `다음 예상 배당금은 주당 ${fmtMoney(prediction.predictedAmount)}, 예측 신뢰도는 ${(prediction.confidenceScore * 100).toFixed(0)}%입니다.`
          : "아직 신뢰할 만한 다음 배당 예측이 없습니다.",
      whatInvestorsAreWatching: mostDiscussed
        ? `투자자들은 "${mostDiscussed.title}"에 대해 가장 활발히 논의하고 있습니다.`
        : "아직 투자자 논의가 시작되지 않았습니다 — 첫 질문을 남겨보세요.",
      upcomingCatalyst: catalystKo(prediction),
    };
  }

  return {
    todaysOutlook: [
      priceMoveEn(ticker, priceDeltaPct),
      cradyScore != null && riskLabel
        ? `CRADY Score is ${cradyScore.toFixed(1)}, with ${riskLabel} risk.`
        : "Not enough risk data yet.",
    ].join(" "),
    bullCase:
      annualYieldPct != null
        ? `The ${fmtPct(annualYieldPct, "en")} annualized yield is competitive within the ${provider} lineup${
            dividendTrendPct != null && dividendTrendPct >= 0 ? ", and the recent dividend trend has held up." : "."
          }`
        : "Not enough real payment data yet to make a bull case.",
    bearCase:
      maxDrawdownPct != null
        ? `A historical max drawdown of ${fmtPct(maxDrawdownPct, "en")} is the volatility trade-off behind that yield.`
        : dividendTrendPct != null && dividendTrendPct < 0
          ? `The recent dividend trend is down ${fmtPct(dividendTrendPct, "en")}.`
          : "Not enough volatility data yet.",
    biggestRisk: riskLabel
      ? `Risk level is currently classified as ${riskLabel}${
          maxDrawdownPct != null ? ` (max drawdown ${fmtPct(maxDrawdownPct, "en")}).` : "."
        }`
      : "Risk metrics haven't been calculated yet.",
    dividendConfidence:
      prediction?.predictedAmount != null && prediction.confidenceScore != null
        ? `The next predicted dividend is ${fmtMoney(prediction.predictedAmount)} per share, at ${(prediction.confidenceScore * 100).toFixed(0)}% confidence.`
        : "No confident next-dividend prediction yet.",
    whatInvestorsAreWatching: mostDiscussed
      ? `Investors are most actively discussing "${mostDiscussed.title}."`
      : "No investor discussion yet — be the first to ask a question.",
    upcomingCatalyst: catalystEn(prediction),
  };
}

function priceMoveEn(ticker: string, priceDeltaPct: number | null): string {
  if (priceDeltaPct == null) return `${ticker} has no recent price data.`;
  if (Math.abs(priceDeltaPct) < 0.1) return `${ticker} is roughly flat today.`;
  return `${ticker} is ${priceDeltaPct >= 0 ? "up" : "down"} ${fmtPct(Math.abs(priceDeltaPct), "en")} today.`;
}
function priceMoveKo(ticker: string, priceDeltaPct: number | null): string {
  if (priceDeltaPct == null) return `${ticker}의 최근 가격 데이터가 없습니다.`;
  if (Math.abs(priceDeltaPct) < 0.1) return `${ticker}는 오늘 거의 보합입니다.`;
  return `${ticker}는 오늘 ${fmtPct(priceDeltaPct, "ko")} ${priceDeltaPct >= 0 ? "상승" : "하락"}했습니다.`;
}

function catalystEn(input: AiOutlookInput["prediction"]): string {
  if (input?.targetExDate) return `Next ex-dividend date is estimated at ${input.targetExDate}.`;
  if (input?.targetPayDate) return `Next payment is estimated around ${input.targetPayDate}.`;
  return "No upcoming payment date scheduled yet.";
}
function catalystKo(input: AiOutlookInput["prediction"]): string {
  if (input?.targetExDate) return `다음 배당락일은 ${input.targetExDate}로 예상됩니다.`;
  if (input?.targetPayDate) return `다음 지급일은 ${input.targetPayDate} 전후로 예상됩니다.`;
  return "예정된 다음 지급일이 아직 없습니다.";
}

/** A data-volume confidence, never a sentiment-accuracy claim — this is what
 * keeps it from ever "imitating a user or claiming to represent investor
 * consensus" (the constraint the product spec is explicit about). */
export function buildActivityConfidence(
  signals: AiOutlookInput["activitySignals"],
  lang: "en" | "ko" = "en"
): ActivityConfidence {
  const signalCount = signals.questionCount + signals.totalComments + signals.voteCount;
  const level: ActivityConfidence["level"] =
    signalCount === 0 ? "low" : signalCount < 5 ? "building" : signalCount < 20 ? "moderate" : "established";
  return { level, label: CONFIDENCE_LEVEL[level][lang] };
}

export type WeeklyRecapInput = {
  ticker: string;
  priceDeltaPct7d: number | null;
  distributionsPaid7d: number;
  totalPaidAmount7d: number | null;
  newQuestions7d: number;
  newComments7d: number;
  /** Real prediction/confidence-change headlines from the trailing 7 days
   * (Activity Engine Phase 2's prediction_change/confidence_change events)
   * — never re-derived here, just passed through for display. */
  forecastChangeHeadlines: string[];
  /** A real, upcoming (not-yet-passed) date to watch — next predicted
   * ex-dividend or payment date. Omitted from the report if none exists. */
  upcomingDate: { label: string; date: string } | null;
};

export type WeeklyRecapReport = {
  oneSentence: string;
  priceMovement: string | null;
  distributionActivity: string;
  forecastChange: string;
  investorActivity: string;
  whatToWatch: string | null;
};

/** Rule-based rollup, computed at render time — not a stored/cron artifact.
 * Every section is independently honest: real data renders as a real
 * sentence, no real data for a section this week renders the explicit "no
 * change" sentence the product spec asks for (never omitted silently and
 * never invented filler) — the one exception being priceMovement/
 * whatToWatch, which are omitted entirely when there's truly no underlying
 * data point at all (not even a "no change" state to report). */
export function buildWeeklyRecap(input: WeeklyRecapInput, lang: "en" | "ko" = "en"): WeeklyRecapReport {
  const {
    ticker,
    priceDeltaPct7d,
    distributionsPaid7d,
    totalPaidAmount7d,
    newQuestions7d,
    newComments7d,
    forecastChangeHeadlines,
    upcomingDate,
  } = input;

  const ko = lang === "ko";

  const oneSentence = ko
    ? priceDeltaPct7d != null
      ? `${ticker}는 이번 주 ${fmtPct(priceDeltaPct7d, "ko")} 움직였습니다.`
      : `${ticker}의 이번 주 요약입니다.`
    : priceDeltaPct7d != null
      ? `${ticker} moved ${fmtPct(priceDeltaPct7d, "en")} this week.`
      : `Here's ${ticker}'s week.`;

  const priceMovement =
    priceDeltaPct7d == null
      ? null
      : ko
        ? `주가는 지난 7일간 ${fmtPct(priceDeltaPct7d, "ko")} 변동했습니다.`
        : `The share price moved ${fmtPct(priceDeltaPct7d, "en")} over the past 7 days.`;

  const distributionActivity =
    distributionsPaid7d > 0 && totalPaidAmount7d != null
      ? ko
        ? `이번 주 배당 ${distributionsPaid7d}건, 총 ${fmtMoney(totalPaidAmount7d)}가 지급되었습니다.`
        : `${distributionsPaid7d} distribution(s) totaling ${fmtMoney(totalPaidAmount7d)} were paid this week.`
      : ko
        ? "이번 주 지급된 배당은 없었습니다."
        : "No distributions were paid this week.";

  const forecastChange =
    forecastChangeHeadlines.length > 0
      ? forecastChangeHeadlines.join(" ")
      : ko
        ? "이번 주 배당 예측이나 신뢰도에 큰 변화는 없었습니다."
        : "No major distribution or forecast changes were recorded this week.";

  const investorActivity =
    newQuestions7d > 0 || newComments7d > 0
      ? ko
        ? `새 질문 ${newQuestions7d}건, 새 댓글 ${newComments7d}건이 등록되었습니다.`
        : `${newQuestions7d} new question(s) and ${newComments7d} new comment(s) were posted.`
      : ko
        ? "이번 주 새로운 투자자 논의는 없었습니다."
        : "No new investor discussion this week.";

  const whatToWatch = !upcomingDate
    ? null
    : ko
      ? `다음 주 주목할 점: ${upcomingDate.label} ${upcomingDate.date}.`
      : `What to watch next week: ${upcomingDate.label} on ${upcomingDate.date}.`;

  return { oneSentence, priceMovement, distributionActivity, forecastChange, investorActivity, whatToWatch };
}
