import type { Metadata } from "next";
import { getSitewideEvaluatedPredictions } from "@/lib/distributions/data";
import { computeSiteAccuracy, computeTickerAccuracy } from "@/lib/accuracy/siteAccuracy";
import { PredictionAccuracyReport } from "@/components/accuracy/PredictionAccuracyReport";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "CRADY 예측 정확도 — 실제 지급액과 얼마나 가까웠을까요?",
  description:
    "CRADY의 다음 배당 예측이 실제 ETF 지급액과 얼마나 일치했는지, 파이프라인이 평가한 실제 데이터를 기준으로 평균 오차, 오차 범위 내 비율, ETF별 기록을 확인하세요.",
  alternates: {
    canonical: "https://crady.net/ko/prediction-accuracy",
    languages: {
      en: "https://crady.net/prediction-accuracy",
      ko: "https://crady.net/ko/prediction-accuracy",
      "x-default": "https://crady.net/prediction-accuracy",
    },
  },
  openGraph: {
    title: "CRADY 예측 정확도",
    description: "CRADY의 다음 배당 예측이 실제 공식 지급액과 얼마나 일치했는지 확인하세요.",
    url: "https://crady.net/ko/prediction-accuracy",
    type: "website",
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
};

export default async function KoreanPredictionAccuracyPage() {
  const rows = await getSitewideEvaluatedPredictions();
  const summary = computeSiteAccuracy(rows);
  const tickerRows = computeTickerAccuracy(rows);

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net/ko" },
          { name: "Prediction Accuracy", url: "https://crady.net/ko/prediction-accuracy" },
        ]}
      />
      <PredictionAccuracyReport summary={summary} tickerRows={tickerRows} lang="ko" basePath="/ko" />
    </div>
  );
}
