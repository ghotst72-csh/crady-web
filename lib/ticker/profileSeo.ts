import { providerLabel } from "@/lib/providers";
import { describeTiming, describeTimingKo } from "@/lib/magazine/timing";
import type { FaqItem } from "@/lib/magazine/types";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

export type ProfileSeoInput = {
  ticker: string;
  name: string | null;
  providerId: string;
  category: string | null;
  riskLevel: string | null;
  cradyScore: number | null;
  payoutFrequency: string | null;
  annualYieldPct: number | null;
  prediction: { targetPayDate: string | null; predictedAmount: number | null } | null;
  latestPaidDistribution: { amount: number; payDate: string } | null;
};

function fmtMoney(n: number | null | undefined): string {
  return n != null ? `$${n.toFixed(4)}` : "—";
}
function fmtPct(n: number | null | undefined): string {
  return n != null ? `${n.toFixed(1)}%` : "—";
}

/** The main ticker profile page (/[ticker]) is the shortest, most-linked
 * URL for every ETF on the site, yet — unlike the Magazine article system —
 * it had no self-contained snippet lead, no FAQ, and no FAQPage/Speakable
 * structured data (AI Overview Optimization Phase 1). This is the profile
 * page's own 50-70 word answer to "what is this ETF," distinct in wording
 * from the Magazine dividend-guide snippet so the two pages never read as
 * duplicate content, even though both are grounded in the same numbers. */
export function buildProfileSnippet(data: ProfileSeoInput, lang: "en" | "ko" = "en"): string {
  const { ticker, name, providerId, payoutFrequency, annualYieldPct, cradyScore, riskLevel, prediction } = data;
  const provider = providerLabel(providerId);

  if (lang === "ko") {
    const parts: string[] = [];
    parts.push(
      `${ticker}${name ? `(${name})` : ""}는 ${provider}가 발행하는${
        payoutFrequency ? ` ${payoutFrequency}` : ""
      } 배당 ETF입니다.`
    );
    if (annualYieldPct != null) {
      parts.push(`최근 90일 실지급 기준 연환산 예상 분배율은 ${fmtPct(annualYieldPct)}입니다.`);
    }
    if (cradyScore != null && riskLevel) {
      parts.push(
        `CRADY 점수는 ${cradyScore.toFixed(1)}/100이며, 위험도는 ${RISK_LABEL.ko[riskLevel] ?? riskLevel} 등급으로 분류됩니다.`
      );
    }
    if (prediction?.targetPayDate && prediction.predictedAmount != null) {
      const timing = describeTimingKo(prediction.targetPayDate);
      parts.push(
        `다음 예상 배당금은 주당 ${fmtMoney(prediction.predictedAmount)}로, ${
          timing ? `${timing}인 ` : ""
        }${prediction.targetPayDate}에 지급될 것으로 예상됩니다.`
      );
    }
    return parts.join(" ");
  }

  const parts: string[] = [];
  parts.push(
    `${ticker}${name ? ` (${name})` : ""} is a${payoutFrequency ? ` ${payoutFrequency}` : ""} dividend ETF issued by ${provider}.`
  );
  if (annualYieldPct != null) {
    parts.push(
      `Its estimated annualized distribution yield is ${fmtPct(annualYieldPct)}, based on the trailing 90-day actual payment run-rate.`
    );
  }
  if (cradyScore != null && riskLevel) {
    parts.push(
      `${ticker} has a CRADY Score of ${cradyScore.toFixed(1)}/100 and is classified as ${
        (RISK_LABEL.en[riskLevel] ?? riskLevel).toLowerCase()
      } risk.`
    );
  }
  if (prediction?.targetPayDate && prediction.predictedAmount != null) {
    const timing = describeTiming(prediction.targetPayDate);
    parts.push(
      `Its next dividend is estimated at ${fmtMoney(prediction.predictedAmount)} per share, expected ${
        timing ? `${timing}, around` : "around"
      } ${prediction.targetPayDate}.`
    );
  }
  return parts.join(" ");
}

/** Profile-level FAQ — identity/overview questions ("what is X," "who
 * issues X," "what category") that complement rather than repeat the
 * Magazine system's deep-dive FAQs (next-dividend-prediction owns the
 * "when/how much is the next dividend" questions; dividend-guide owns
 * the detailed yield-methodology question; risk-analysis owns the
 * detailed volatility/drawdown questions). Each answer here is short and
 * points to the relevant deep-dive page — via the Deep Dive chip row
 * right below — for anyone who wants more. */
export function buildProfileFaqItems(data: ProfileSeoInput, lang: "en" | "ko" = "en"): FaqItem[] {
  const { ticker, name, providerId, category, payoutFrequency, annualYieldPct, cradyScore, riskLevel, prediction } =
    data;
  const provider = providerLabel(providerId);

  if (lang === "ko") {
    const items: FaqItem[] = [
      {
        question: `${ticker}는 어떤 ETF인가요?`,
        answer: `${ticker}${name ? `(${name})` : ""}는 ${provider}가 발행하는${
          category ? ` ${category} 카테고리의` : ""
        } 배당 ETF입니다.`,
      },
      {
        question: `${ticker}의 운용사는 어디인가요?`,
        answer: `${ticker}는 ${provider}가 발행 및 운용합니다.`,
      },
    ];
    if (payoutFrequency) {
      items.push({
        question: `${ticker}는 월배당인가요, 주배당인가요?`,
        answer: `${ticker}는 최근 지급 이력을 기준으로 ${payoutFrequency} 배당 ETF입니다.`,
      });
    }
    if (annualYieldPct != null) {
      items.push({
        question: `${ticker}의 배당 수익률은 얼마인가요?`,
        answer: `${ticker}의 최근 90일 실지급 기준 연환산 예상 수익률은 약 ${fmtPct(annualYieldPct)}입니다. 계산 방식과 상세 분석은 ${ticker} 배당 가이드에서 확인하세요.`,
      });
    }
    if (cradyScore != null && riskLevel) {
      items.push({
        question: `${ticker}의 CRADY 점수와 위험도는 어떻게 되나요?`,
        answer: `${ticker}의 CRADY 점수는 ${cradyScore.toFixed(1)}/100이며, ${RISK_LABEL.ko[riskLevel] ?? riskLevel} 등급으로 분류됩니다. 상세 위험 분석은 ${ticker} 리스크 분석에서 확인하세요.`,
      });
    }
    if (prediction?.targetPayDate) {
      items.push({
        question: `${ticker}의 다음 배당일은 언제인가요?`,
        answer: `CRADY 예측에 따르면 ${ticker}의 다음 배당 지급일은 ${prediction.targetPayDate}입니다. 전체 예측 내역은 ${ticker} 다음 배당 예측에서 확인하세요.`,
      });
    }
    return items;
  }

  const items: FaqItem[] = [
    {
      question: `What is ${ticker}?`,
      answer: `${ticker}${name ? ` (${name})` : ""} is a${category ? ` ${category}` : ""} dividend ETF issued by ${provider}.`,
    },
    {
      question: `Who issues ${ticker}?`,
      answer: `${ticker} is issued and managed by ${provider}.`,
    },
  ];
  if (payoutFrequency) {
    items.push({
      question: `Is ${ticker} a monthly or weekly dividend ETF?`,
      answer: `${ticker} is a ${payoutFrequency} dividend ETF, based on its recent payment cadence.`,
    });
  }
  if (annualYieldPct != null) {
    items.push({
      question: `What is ${ticker}'s dividend yield?`,
      answer: `${ticker}'s estimated annualized distribution yield is ${fmtPct(annualYieldPct)}, based on its trailing 90-day actual payment run-rate. See the ${ticker} Dividend Guide for the full yield methodology.`,
    });
  }
  if (cradyScore != null && riskLevel) {
    items.push({
      question: `Is ${ticker} risky?`,
      answer: `${ticker} has a CRADY Score of ${cradyScore.toFixed(1)}/100 and is classified as ${
        (RISK_LABEL.en[riskLevel] ?? riskLevel).toLowerCase()
      } risk. See the ${ticker} Risk Analysis for the full volatility and dividend-stability breakdown.`,
    });
  }
  if (prediction?.targetPayDate) {
    items.push({
      question: `When is ${ticker}'s next dividend?`,
      answer: `CRADY estimates ${ticker}'s next dividend will be paid on ${prediction.targetPayDate}. See the ${ticker} Next Dividend Prediction for the full forecast, confidence score, and methodology.`,
    });
  }
  return items;
}
