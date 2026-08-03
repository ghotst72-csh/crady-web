export type DiscussionQuestionInput = {
  ticker: string;
  annualYieldPct: number | null;
  riskLevel: string | null;
  dividendTrendPct: number | null;
  payoutFrequency: string | null;
  nextPredictedExDate: string | null;
};

export type DiscussionQuestion = {
  text: string;
  /** Which real signal picked this specific question — lets tests (and
   * future maintainers) verify the selection isn't arbitrary. */
  reason: "dividend_trend_down" | "high_yield_high_risk" | "upcoming_ex_date" | "weekly_frequency" | "generic";
};

/** Picks ONE discussion-starter question from the ETF's own real
 * characteristics — never the same fixed sentence for every ticker. Rule
 * priority (most specific/urgent signal first): a real declining dividend
 * trend, then a real high-yield/high-risk combination, then a real
 * upcoming ex-dividend date, then a real weekly payout schedule, only
 * falling back to a generic prompt when none of those signals exist.
 * Rendered with an explicit "CRADY suggests this discussion topic" label
 * by the caller — never posted as if a user asked it. */
export function buildDiscussionQuestion(input: DiscussionQuestionInput, lang: "en" | "ko" = "en"): DiscussionQuestion {
  const { ticker, annualYieldPct, riskLevel, dividendTrendPct, payoutFrequency, nextPredictedExDate } = input;

  if (dividendTrendPct != null && dividendTrendPct <= -5) {
    return {
      reason: "dividend_trend_down",
      text:
        lang === "ko"
          ? `${ticker}의 다음 배당이 증가할까요, 감소할까요?`
          : `Do you expect ${ticker}'s next distribution to increase or decrease?`,
    };
  }

  if (annualYieldPct != null && annualYieldPct >= 50 && (riskLevel === "RISKY" || riskLevel === "EXTREME")) {
    return {
      reason: "high_yield_high_risk",
      text:
        lang === "ko"
          ? `${ticker}의 현재 수익률은 낙폭 위험을 감수할 만한 수준일까요?`
          : `Is ${ticker}'s current yield worth the drawdown risk?`,
    };
  }

  if (nextPredictedExDate) {
    return {
      reason: "upcoming_ex_date",
      text:
        lang === "ko"
          ? `다음 배당락일까지 ${ticker}를 계속 보유하시겠어요?`
          : `Would you hold ${ticker} through the next ex-dividend date?`,
    };
  }

  if (payoutFrequency === "weekly") {
    return {
      reason: "weekly_frequency",
      text:
        lang === "ko"
          ? `${ticker}의 주간 배당 일정은 장점이라고 생각하시나요?`
          : `Is ${ticker}'s weekly distribution schedule an advantage?`,
    };
  }

  return {
    reason: "generic",
    text:
      lang === "ko"
        ? `${ticker}에 대한 투자 의견을 나눠주세요.`
        : `What's your outlook on ${ticker}?`,
  };
}
