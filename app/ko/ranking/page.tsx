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
  title: "ETF 랭킹",
  description: "CRADY 점수, 연환산 분배율, 안정성, 성장성 기준 배당 ETF 랭킹.",
  alternates: {
    canonical: "https://crady.net/ko/ranking",
    languages: {
      en: "https://crady.net/ranking",
      ko: "https://crady.net/ko/ranking",
      "x-default": "https://crady.net/ranking",
    },
  },
};

export default async function KoreanRankingPage() {
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
    name: "CRADY 점수 기준 배당 ETF 랭킹",
    inLanguage: "ko",
    itemListElement: rankings.crady.slice(0, 20).map((etf, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: etf.ticker,
      url: `https://crady.net/ko/${etf.ticker.toLowerCase()}`,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net/ko" },
          { name: "랭킹", url: "https://crady.net/ko/ranking" },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <h1 className="text-2xl font-bold">배당 ETF 랭킹</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        CRADY는 YieldMax, Roundhill, Defiance의 고배당 커버드콜 ETF 전체를 CRADY 점수, 연환산
        분배율, 배당 안정성, 최근 배당 증가율 4가지 기준으로 순위화합니다. 발행사가 제시하는
        예상치가 아니라 실제 지급된 배당 데이터를 기반으로 매일 자동 계산됩니다. 아래에서 기준을
        선택해 순위를 다시 확인하세요.
      </p>

      <div className="mt-6">
        <RankingTable rankings={rankings} lang="ko" basePath="/ko" />
      </div>
    </div>
  );
}
