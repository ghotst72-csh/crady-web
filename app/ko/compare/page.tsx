import type { Metadata } from "next";
import { getHomeSnapshot, toSearchIndex, getComparisonPeer } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { CompareView } from "@/components/compare/CompareView";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ETF 비교 — CRADY",
  description: "두 개의 고배당 커버드콜 ETF를 카드 형태로 나란히 비교하세요: 가격, 연환산 분배율, 위험도, 인컴, 최대 낙폭, 배당 안정성.",
  alternates: {
    canonical: "https://crady.net/ko/compare",
    languages: {
      en: "https://crady.net/compare",
      ko: "https://crady.net/ko/compare",
      "x-default": "https://crady.net/compare",
    },
  },
};

export default async function CompareKoPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const tickerA = (a ?? "").toUpperCase();
  const tickerB = (b ?? "").toUpperCase();

  const [snapshot, peerA, peerB] = await Promise.all([
    getHomeSnapshot(),
    tickerA ? getComparisonPeer(tickerA) : Promise.resolve(null),
    tickerB ? getComparisonPeer(tickerB) : Promise.resolve(null),
  ]);
  const searchIndex = toSearchIndex(snapshot);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: "비교", url: "https://crady.net/ko/compare" },
        ]}
      />
      <h1 className="text-2xl font-bold">ETF 비교</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        두 티커를 선택해 카드 형태로 나란히 비교하세요 — 가격, 연환산 분배율, CRADY 점수, 인컴, 최대 낙폭, 배당 안정성.
      </p>

      <div className="mt-8">
        <CompareView searchIndex={searchIndex} peerA={peerA} peerB={peerB} tickerA={tickerA} tickerB={tickerB} lang="ko" basePath="/ko" />
      </div>
    </div>
  );
}
