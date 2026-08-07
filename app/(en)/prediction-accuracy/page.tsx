import type { Metadata } from "next";
import { getSitewideEvaluatedPredictions } from "@/lib/distributions/data";
import { computeSiteAccuracy, computeTickerAccuracy } from "@/lib/accuracy/siteAccuracy";
import { PredictionAccuracyReport } from "@/components/accuracy/PredictionAccuracyReport";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "CRADY Prediction Accuracy — How Close Have Our Estimates Been?",
  description:
    "Real, pipeline-evaluated accuracy of CRADY's next-dividend predictions versus what ETFs actually paid — average error, within-range rates, and per-ETF track records.",
  alternates: {
    canonical: "https://crady.net/prediction-accuracy",
    languages: {
      en: "https://crady.net/prediction-accuracy",
      ko: "https://crady.net/ko/prediction-accuracy",
      "x-default": "https://crady.net/prediction-accuracy",
    },
  },
  openGraph: {
    title: "CRADY Prediction Accuracy",
    description: "How CRADY's next-dividend predictions have compared to real, official payments.",
    url: "https://crady.net/prediction-accuracy",
    type: "website",
    locale: "en_US",
    alternateLocale: "ko_KR",
  },
};

export default async function PredictionAccuracyPage() {
  const rows = await getSitewideEvaluatedPredictions();
  const summary = computeSiteAccuracy(rows);
  const tickerRows = computeTickerAccuracy(rows);

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Prediction Accuracy", url: "https://crady.net/prediction-accuracy" },
        ]}
      />
      <PredictionAccuracyReport summary={summary} tickerRows={tickerRows} lang="en" />
    </div>
  );
}
