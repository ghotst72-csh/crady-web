/** Short "how this was calculated" line per automated activity `type` —
 * the transparency requirement behind the expandable detail view. Kept as
 * one small lookup table rather than free text on every row, so every
 * type's explanation stays consistent and easy to audit. */
const METHOD_LABEL: Record<string, { en: string; ko: string }> = {
  distribution_event: {
    en: "From the issuer's own declared distribution data.",
    ko: "운용사가 발표한 배당 데이터 기준입니다.",
  },
  price_move: { en: "From CRADY's daily price history.", ko: "CRADY의 일별 주가 데이터 기준입니다." },
  volume_spike: {
    en: "Today's volume compared against its trailing 20-day average.",
    ko: "오늘 거래량을 최근 20일 평균과 비교했습니다.",
  },
  score_change: {
    en: "CRADY Score, recalculated nightly from dividend stability, drawdown, and momentum data.",
    ko: "CRADY 점수는 배당 안정성·낙폭·모멘텀 데이터로 매일 밤 재계산됩니다.",
  },
  risk_level_change: {
    en: "Risk classification, recalculated nightly from volatility and drawdown data.",
    ko: "위험 등급은 변동성·낙폭 데이터로 매일 밤 재계산됩니다.",
  },
  sustainability_change: {
    en: "Recent distributions compared against this ETF's historical average.",
    ko: "최근 배당을 이 ETF의 과거 평균과 비교했습니다.",
  },
  nav_erosion_warning: {
    en: "Cumulative share-price change over the trailing trading days.",
    ko: "최근 거래일 동안의 누적 주가 변화율 기준입니다.",
  },
  prediction_change: {
    en: "CRADY's next-dividend prediction model output.",
    ko: "CRADY의 다음 배당 예측 모델 결과입니다.",
  },
  confidence_change: {
    en: "Confidence score attached to CRADY's next-dividend prediction.",
    ko: "CRADY의 다음 배당 예측에 부여된 신뢰도 점수입니다.",
  },
};

export function calculationMethodLabel(type: string, lang: "en" | "ko" = "en"): string | null {
  return METHOD_LABEL[type]?.[lang] ?? null;
}

const METRIC_LABEL: Record<string, { en: string; ko: string }> = {
  amount: { en: "Amount", ko: "금액" },
  previous_amount: { en: "Previous amount", ko: "이전 금액" },
  ex_date: { en: "Ex-dividend date", ko: "배당락일" },
  pay_date: { en: "Payment date", ko: "지급일" },
  change_percent: { en: "Change", ko: "변동률" },
  close_price: { en: "Close price", ko: "종가" },
  volume: { en: "Volume", ko: "거래량" },
  avg_volume_20d: { en: "20-day avg. volume", ko: "20일 평균 거래량" },
  multiple: { en: "Multiple of average", ko: "평균 대비 배수" },
  score: { en: "CRADY Score", ko: "CRADY 점수" },
  previous_score: { en: "Previous CRADY Score", ko: "이전 CRADY 점수" },
  risk_level: { en: "Risk level", ko: "위험 등급" },
  previous_risk_level: { en: "Previous risk level", ko: "이전 위험 등급" },
  drop_ratio: { en: "Distribution drop ratio", ko: "배당 하락률" },
  previous_drop_ratio: { en: "Previous drop ratio", ko: "이전 하락률" },
  cumulative_change_pct: { en: "Cumulative price change", ko: "누적 주가 변화율" },
  window_days: { en: "Window (trading days)", ko: "기간(거래일)" },
  predicted_amount: { en: "Predicted amount", ko: "예측 금액" },
  confidence: { en: "Confidence", ko: "신뢰도" },
  previous_confidence: { en: "Previous confidence", ko: "이전 신뢰도" },
  trade_date: { en: "Trade date", ko: "거래일" },
};

function formatMetricValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    if (key.includes("pct") || key.includes("percent") || key.includes("ratio")) {
      return `${value >= 0 ? "+" : ""}${(key.includes("ratio") ? value * 100 : value).toFixed(1)}%`;
    }
    if (key === "confidence" || key === "previous_confidence") return `${(value * 100).toFixed(0)}%`;
    if (key === "amount" || key === "previous_amount" || key === "predicted_amount" || key === "close_price") {
      return `$${value.toFixed(4)}`;
    }
    if (key === "multiple") return `${value.toFixed(1)}x`;
    return value.toLocaleString();
  }
  return String(value);
}

/** Renders supportingMetrics as ordered [label, value] pairs — never raw
 * JSON, never a number without its unit — for the detail disclosure. */
export function formatSupportingMetrics(
  metrics: Record<string, unknown> | null,
  lang: "en" | "ko" = "en"
): { label: string; value: string }[] {
  if (!metrics) return [];
  return Object.entries(metrics)
    .filter(([, v]) => v != null)
    .map(([key, value]) => ({
      label: METRIC_LABEL[key]?.[lang] ?? key,
      value: formatMetricValue(key, value),
    }));
}
