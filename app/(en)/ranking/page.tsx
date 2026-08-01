import type { Metadata } from "next";
import {
  getHomeSnapshot,
  topByAnnualYield,
  topByCradyScoreSnapshot,
  topBySafety,
  topByGrowth,
} from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { RankingTable } from "@/components/RankingTable";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ETF Ranking",
  description: "High dividend ETF rankings by CRADY Score, annualized distribution yield, safety, and growth.",
  alternates: {
    canonical: "https://crady.net/ranking",
    languages: {
      en: "https://crady.net/ranking",
      ko: "https://crady.net/ko/ranking",
      "x-default": "https://crady.net/ranking",
    },
  },
};

export default async function RankingPage() {
  const snapshot = await getHomeSnapshot();

  const rankings = {
    crady: topByCradyScoreSnapshot(snapshot, 50),
    yield: topByAnnualYield(snapshot, 50),
    safety: topBySafety(snapshot, 50),
    growth: topByGrowth(snapshot, 50),
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "CRADY Score Dividend ETF Ranking",
    inLanguage: "en",
    itemListElement: rankings.crady.slice(0, 20).map((etf, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: etf.ticker,
      url: `https://crady.net/${etf.ticker.toLowerCase()}`,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Ranking", url: "https://crady.net/ranking" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <h1 className="text-2xl font-bold">Dividend ETF Ranking</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        CRADY ranks every tracked high-dividend covered-call ETF from YieldMax, Roundhill, and
        Defiance by four criteria — CRADY Score, distribution yield, dividend safety, and recent
        payment growth — recalculated automatically each day from real, actually-paid distribution
        data rather than issuer-projected figures. Pick a criterion below to re-rank the list.
      </p>

      <div className="mt-6">
        <RankingTable rankings={rankings} lang="en" />
      </div>
    </div>
  );
}
