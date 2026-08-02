/** Single source of truth for the E-E-A-T footer shown on ticker pages,
 * magazine articles, hub/calendar-hub pages, and standalone guides
 * (components/seo/PageTrustFooter.tsx). Condensed from the full
 * methodology copy on /about#methodology (app/(en)/about/page.tsx) and
 * /ko/about#methodology — this is the short, page-footer version; the
 * full explanation stays on the About page as the one canonical long-form
 * copy, linked from here rather than duplicated. */

export type EeatCopy = {
  methodologyLabel: string;
  methodology: string;
  dataSourcesLabel: string;
  dataSources: string;
  updateFrequencyLabel: string;
  updateFrequency: string;
  disclaimerLabel: string;
  disclaimer: string;
  learnMoreLabel: string;
};

export const EEAT_COPY: Record<"en" | "ko", EeatCopy> = {
  en: {
    methodologyLabel: "Methodology",
    methodology:
      "Every figure on this page (yield, CRADY Score, next-dividend prediction) is computed by rule-based logic from real payment history — never hand-written or guessed.",
    dataSourcesLabel: "Data Sources",
    dataSources:
      "Prices, dividend payment history, and payment schedules are collected from each ETF issuer's public disclosures and public market data.",
    updateFrequencyLabel: "Update Frequency",
    updateFrequency:
      "Prices, dividend history, predictions, and CRADY Scores refresh automatically once a day through an automated pipeline — no manual editing of any figure.",
    disclaimerLabel: "Disclaimer",
    disclaimer:
      "All figures are statistical estimates based on historical data, not investment advice. Predictions can differ from an issuer's eventual official announcement.",
    learnMoreLabel: "Read the full methodology",
  },
  ko: {
    methodologyLabel: "산출 방법론",
    methodology:
      "이 페이지의 모든 수치(분배율, CRADY 점수, 다음 배당 예측)는 실제 지급 내역을 바탕으로 규칙 기반 로직이 자동 계산합니다 — 사람이 직접 작성하거나 추측하지 않습니다.",
    dataSourcesLabel: "데이터 출처",
    dataSources:
      "가격, 배당 지급 내역, 배당 일정은 각 ETF 운용사가 공개하는 공시 자료 및 공개 시장 데이터를 기반으로 수집합니다.",
    updateFrequencyLabel: "업데이트 주기",
    updateFrequency:
      "가격, 배당 내역, 예측치, CRADY 점수는 매일 자동화된 파이프라인을 통해 갱신됩니다 — 사람이 수동으로 개별 수치를 편집하지 않습니다.",
    disclaimerLabel: "면책조항",
    disclaimer:
      "모든 수치는 과거 데이터를 기반으로 한 통계적 추정치이며 투자 권유가 아닙니다. 예측은 운용사의 공식 발표와 다를 수 있습니다.",
    learnMoreLabel: "전체 방법론 보기",
  },
};
