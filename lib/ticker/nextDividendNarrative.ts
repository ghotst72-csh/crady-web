import type { EtfType } from "./nextDividendIntelligence";

/** CRADY Engagement & Intelligence Phase 2, Part A §4/§10 — "Why This
 * Estimate?" Rule-based, varies by real ETF type and real data
 * availability (never the same sentence copy-pasted across tickers — see
 * the deployment report for concrete distinct examples). Underlying stock
 * price data (e.g. TSLA itself) does not exist anywhere in this pipeline
 * (confirmed by direct query before writing this — etf_price_history has
 * zero rows for any underlying ticker), so the single-stock branch's
 * "underlying movement" clause is the HONEST-OMISSION path in practice,
 * not a rare edge case. */

export type WhyEstimateInput = {
  ticker: string;
  etfType: EtfType;
  underlyingTicker: string | null;
  underlyingMovementPct: number | null; // real only if we ever get real underlying price data
  hasVolatilityData: boolean;
  volatilityPct: number | null;
  recentAmountsCount: number;
  payoutFrequency: string | null;
  pointEstimate: number | null;
};

function freqWord(payoutFrequency: string | null, lang: "en" | "ko"): string {
  const f = payoutFrequency?.toLowerCase() ?? null;
  if (lang === "ko") {
    if (f === "weekly") return "주간";
    if (f === "monthly") return "월간";
    return "정기";
  }
  if (f === "weekly") return "weekly";
  if (f === "monthly") return "monthly";
  return "recurring";
}

export function buildWhyThisEstimate(input: WhyEstimateInput, lang: "en" | "ko" = "en"): string {
  const { ticker, etfType, underlyingTicker, underlyingMovementPct, hasVolatilityData, volatilityPct, recentAmountsCount, payoutFrequency, pointEstimate } = input;
  const amountStr = pointEstimate != null ? `$${pointEstimate.toFixed(4)}` : lang === "ko" ? "다음 분배금" : "its next distribution";
  const freq = freqWord(payoutFrequency, lang);

  const clauses: string[] = [];

  if (etfType === "single-stock-covered-call" && underlyingTicker) {
    clauses.push(
      lang === "ko"
        ? underlyingMovementPct != null
          ? `이번 예상 기간 중 ${underlyingTicker} 가격 움직임(${underlyingMovementPct >= 0 ? "+" : ""}${underlyingMovementPct.toFixed(1)}%)`
          : `${underlyingTicker}의 옵션 운용 기간 가격 움직임(직접적인 기초자산 가격 데이터는 현재 CRADY에 없어 참고용으로만 반영)`
        : underlyingMovementPct != null
          ? `${underlyingTicker}'s price movement during the current option-income period (${underlyingMovementPct >= 0 ? "+" : ""}${underlyingMovementPct.toFixed(1)}%)`
          : `${underlyingTicker}'s general price behavior during the option-income period (direct underlying price data is not currently available to CRADY, so this is not factored in numerically)`
    );
  } else if (etfType === "index-covered-call") {
    clauses.push(
      lang === "ko" ? "기초 지수 및 옵션 오버레이 구조의 최근 움직임" : "the underlying index and option-overlay structure's recent behavior"
    );
  } else if (etfType === "traditional-dividend") {
    clauses.push(lang === "ko" ? "구성 종목들의 최근 배당 발표" : "recent dividend announcements from the fund's underlying holdings");
  } else {
    clauses.push(lang === "ko" ? "현재 금리 환경과 채권 이자수익" : "the current interest-rate environment and bond income");
  }

  clauses.push(
    lang === "ko"
      ? hasVolatilityData
        ? `변동성 수준(${volatilityPct != null ? volatilityPct.toFixed(1) + "%" : "실측값"})`
        : "변동성 데이터(직접적인 옵션 내재변동성 데이터는 없어 가격 변동폭을 제한적 대용치로 사용)"
      : hasVolatilityData
        ? `volatility levels (${volatilityPct != null ? volatilityPct.toFixed(1) + "%" : "measured"})`
        : "volatility (direct implied-volatility data is unavailable, so recent price variation is used only as a limited proxy)"
  );

  clauses.push(
    lang === "ko"
      ? recentAmountsCount > 0
        ? `최근 ${ticker} 분배금 흐름`
        : "아직 충분한 배당 이력이 없어 제한적으로 반영된 최근 분배 정보"
      : recentAmountsCount > 0
        ? `recent ${ticker} distributions`
        : "limited recent distribution history"
  );

  const scheduleClause =
    lang === "ko"
      ? `반복되는 ${freq} 분배 일정`
      : `its recurring ${freq} distribution schedule`;

  const lead =
    lang === "ko"
      ? `CRADY는 ${ticker}의 다음 주당 분배금을 약 ${amountStr}로 예상합니다.`
      : `CRADY estimates ${ticker}'s next distribution at approximately ${amountStr} per share.`;

  const body =
    lang === "ko"
      ? `이번 예상에는 ${clauses.join(", ")}, 그리고 ${scheduleClause}이 반영되었습니다.`
      : `The estimate reflects ${clauses.join(", ")}, and ${scheduleClause}.`;

  const disclaimer =
    lang === "ko" ? "아직 운용사가 공식적으로 선언한 금액은 아닙니다." : "The amount has not yet been officially declared.";

  return `${lead} ${body} ${disclaimer}`;
}

/** SEO direct-answer sentence for the "estimated" state (§13) — distinct
 * from buildWhyThisEstimate (which is the longer expandable explanation);
 * this is the single quotable sentence for search/AI-overview surfaces. */
export function buildNextDividendDirectAnswer(
  input: {
    ticker: string;
    exDate: string | null;
    pointEstimate: number | null;
    isOfficial: boolean;
    officialAmount: number | null;
    payDate: string | null;
  },
  lang: "en" | "ko" = "en"
): string | null {
  const { ticker, exDate, pointEstimate, isOfficial, officialAmount, payDate } = input;

  if (isOfficial && officialAmount != null && exDate && payDate) {
    return lang === "ko"
      ? `${ticker}는 주당 $${officialAmount.toFixed(4)}의 배당을 공식 발표했습니다. 배당락일은 ${exDate}, 지급일은 ${payDate}입니다.`
      : `${ticker} officially declared a distribution of $${officialAmount.toFixed(4)} per share. The ex-dividend date is ${exDate}, and the payment date is ${payDate}.`;
  }

  if (exDate && pointEstimate != null) {
    return lang === "ko"
      ? `${ticker}의 다음 배당락일은 ${exDate}로 예상됩니다. CRADY는 최근 ${ticker} 분배금, 변동성, 현재 가격 수준, 반복 분배 일정을 근거로 주당 약 $${pointEstimate.toFixed(4)}의 분배금을 예상하며, 아직 공식 발표된 금액은 아닙니다.`
      : `${ticker}'s next ex-dividend date is expected on ${exDate}. CRADY currently estimates a distribution of approximately $${pointEstimate.toFixed(4)} per share, based on recent ${ticker} distributions, volatility, the fund's current price level, and its recurring schedule. The amount has not yet been officially declared.`;
  }

  return null;
}

// ── Intelligence 4.0 — deepened "Why This Estimate?" ─────────────────────
//
// Reclassifies the existing flat high/medium/low driver list (see
// buildEstimateDrivers in nextDividendIntelligence.ts) into the spec's
// Positive / Negative / Unknown structure. These are factors about the
// ESTIMATE'S RELIABILITY (how much real data backs it), not a claim about
// which direction the actual payout will move — that distinction matters
// because there's no verified causal model in this codebase for how
// underlying price movement translates into payout size, and asserting
// one would be exactly the kind of fabrication the spec forbids.

export type EstimateFactorsInput = {
  recentAmountsCount: number;
  isOfficiallyDeclared: boolean;
  /** Real, from lib/ticker/underlyingMomentum.ts — the underlying stock's
   * own trailing volatility, when this ETF tracks one and CRADY has data
   * for it. Previously hardcoded as unavailable; now wired to the real
   * underlying_momentum_metrics table. */
  underlyingVolatility30d: number | null;
  hasUnderlyingTicker: boolean;
  underlyingTicker: string | null;
};

export type EstimateFactors = {
  positive: string[];
  negative: string[];
  unknown: string[];
};

const HIGH_UNDERLYING_VOLATILITY = 50;

export function buildEstimateFactors(input: EstimateFactorsInput, lang: "en" | "ko" = "en"): EstimateFactors {
  const positive: string[] = [];
  const negative: string[] = [];
  const unknown: string[] = [];

  if (input.recentAmountsCount >= 4) {
    positive.push(
      lang === "ko" ? "충분한 최근 분배 이력이 있어 패턴을 파악할 수 있습니다." : "Enough recent distribution history exists to establish a real pattern."
    );
  } else if (input.recentAmountsCount > 0) {
    unknown.push(
      lang === "ko" ? "최근 분배 이력이 아직 제한적입니다." : "Recent distribution history is still limited."
    );
  } else {
    negative.push(
      lang === "ko" ? "참고할 최근 분배 이력이 없습니다." : "No recent distribution history exists to draw on."
    );
  }

  if (input.isOfficiallyDeclared) {
    positive.push(
      lang === "ko" ? "이번 금액은 이미 운용사가 공식 발표했습니다." : "This amount has already been officially declared by the issuer."
    );
  } else {
    unknown.push(
      lang === "ko" ? "아직 운용사의 공식 발표 전입니다." : "Not yet officially declared by the issuer."
    );
  }

  if (input.hasUnderlyingTicker && input.underlyingVolatility30d != null) {
    if (input.underlyingVolatility30d >= HIGH_UNDERLYING_VOLATILITY) {
      negative.push(
        lang === "ko"
          ? `${input.underlyingTicker}의 30일 변동성이 ${input.underlyingVolatility30d.toFixed(1)}%로 높아 다음 분배금의 불확실성이 커집니다.`
          : `${input.underlyingTicker}'s 30-day volatility is high (${input.underlyingVolatility30d.toFixed(1)}%), which widens the uncertainty around the next distribution.`
      );
    } else {
      positive.push(
        lang === "ko"
          ? `${input.underlyingTicker}의 30일 변동성이 ${input.underlyingVolatility30d.toFixed(1)}%로 상대적으로 안정적입니다.`
          : `${input.underlyingTicker}'s 30-day volatility is comparatively moderate (${input.underlyingVolatility30d.toFixed(1)}%).`
      );
    }
  } else if (input.hasUnderlyingTicker) {
    unknown.push(
      lang === "ko"
        ? `${input.underlyingTicker ?? "기초자산"}의 변동성 데이터를 아직 확보하지 못했습니다.`
        : `Volatility data for ${input.underlyingTicker ?? "the underlying stock"} isn't available yet.`
    );
  }

  return { positive, negative, unknown };
}

export type WhatWouldChangeInput = {
  isOfficiallyDeclared: boolean;
  hasUnderlyingTicker: boolean;
  underlyingTicker: string | null;
};

/** "What would change this estimate?" — real mechanics only, no
 * speculative "if the market does X" language beyond what the model
 * genuinely reacts to. */
export function buildWhatWouldChangeThis(input: WhatWouldChangeInput, lang: "en" | "ko" = "en"): string[] {
  const items: string[] = [];
  if (!input.isOfficiallyDeclared) {
    items.push(
      lang === "ko"
        ? "운용사의 공식 발표가 나오면, 이 예상치는 확정 금액으로 즉시 대체됩니다."
        : "An official declaration from the issuer would immediately replace this estimate with the confirmed amount."
    );
  }
  items.push(
    lang === "ko"
      ? "이후 실제 분배금이 새로 지급될 때마다, 최근 분배 흐름이 갱신되어 다음 예상치에 반영됩니다."
      : "Each newly paid distribution updates the recent-history pattern this estimate is based on."
  );
  if (input.hasUnderlyingTicker) {
    items.push(
      lang === "ko"
        ? `${input.underlyingTicker ?? "기초자산"}의 실현 변동성이 크게 바뀌면, 예상 범위(Bull/Bear)가 함께 달라집니다.`
        : `A significant change in ${input.underlyingTicker ?? "the underlying stock"}'s realized volatility would shift the estimated range.`
    );
  }
  return items;
}

export type NextDividendFaqItem = { question: string; answer: string };

export function buildNextDividendFaq(
  input: {
    ticker: string;
    exDate: string | null;
    payDate: string | null;
    declarationDate: string | null;
    pointEstimate: number | null;
    isOfficial: boolean;
    officialAmount: number | null;
  },
  lang: "en" | "ko" = "en"
): NextDividendFaqItem[] {
  const { ticker, exDate, payDate, declarationDate, pointEstimate, isOfficial, officialAmount } = input;
  const items: NextDividendFaqItem[] = [];

  if (exDate) {
    items.push({
      question: lang === "ko" ? `${ticker}의 다음 배당락일은 언제인가요?` : `When is the next ${ticker} ex-dividend date?`,
      answer:
        lang === "ko"
          ? `${ticker}의 다음 배당락일은 ${exDate}${isOfficial ? "로 공식 확정되었습니다" : "로 예상됩니다"}.`
          : `${ticker}'s next ex-dividend date is ${isOfficial ? "" : "expected on "}${exDate}${isOfficial ? " (official)" : ""}.`,
    });
  }

  if (declarationDate) {
    items.push({
      question: lang === "ko" ? `${ticker}는 언제 다음 배당을 선언하나요?` : `When will ${ticker} declare its next distribution?`,
      answer:
        lang === "ko"
          ? `${ticker}의 다음 배당 선언일은 약 ${declarationDate}로 예상됩니다.`
          : `${ticker} is expected to declare its next distribution around ${declarationDate}.`,
    });
  }

  if (pointEstimate != null || officialAmount != null) {
    items.push({
      question: lang === "ko" ? `${ticker}는 얼마를 지급할 것으로 예상되나요?` : `How much is ${ticker} expected to pay?`,
      answer: isOfficial && officialAmount != null
        ? lang === "ko"
          ? `${ticker}는 주당 $${officialAmount.toFixed(4)}을 공식 발표했습니다.`
          : `${ticker} officially declared $${officialAmount.toFixed(4)} per share.`
        : pointEstimate != null
          ? lang === "ko"
            ? `아직 공식 발표 전이며, CRADY는 주당 약 $${pointEstimate.toFixed(4)}을 예상합니다.`
            : `Not yet officially declared — CRADY currently estimates approximately $${pointEstimate.toFixed(4)} per share.`
          : "",
    });
  }

  items.push({
    question: lang === "ko" ? `CRADY는 왜 이 금액을 예상하나요?` : `Why does CRADY expect this amount?`,
    answer:
      lang === "ko"
        ? `최근 분배금 흐름, 변동성, 현재 가격 수준, 반복되는 분배 일정을 근거로 규칙 기반으로 계산됩니다.`
        : `The estimate is calculated from recent distribution history, volatility, current price level, and the fund's recurring schedule.`,
  });

  items.push({
    question: lang === "ko" ? `다음 ${ticker} 배당은 공식 확정인가요, 예상치인가요?` : `Is the next ${ticker} distribution official or estimated?`,
    answer:
      isOfficial
        ? lang === "ko"
          ? "공식 발표된 금액입니다."
          : "This is an officially declared amount."
        : lang === "ko"
          ? "아직 CRADY의 예상치이며 공식 발표된 금액이 아닙니다."
          : "This is currently a CRADY estimate, not an officially declared amount.",
  });

  if (payDate) {
    items.push({
      question: lang === "ko" ? `다음 ${ticker} 지급일은 언제인가요?` : `When is the next ${ticker} payment date?`,
      answer:
        lang === "ko" ? `다음 지급일은 ${payDate}${isOfficial ? "로 확정되었습니다" : "로 예상됩니다"}.` : `The next payment date is ${isOfficial ? "" : "expected around "}${payDate}${isOfficial ? " (official)" : ""}.`,
    });
  }

  return items;
}
