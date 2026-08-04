import type { Metadata } from "next";
import { getHomeSnapshot, toSearchIndex } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PortfolioAnalyzer } from "@/components/portfolio/PortfolioAnalyzer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ETF 총수익 계산기 — 포트폴리오 분석기",
  description:
    "고배당 커버드콜 ETF의 실제 배당 반영 총수익을 계산하세요. 가격 수익률과 배당 수익을 분리해서 확인하고, 같은 날짜에 다른 ETF를 샀다면 어땠을지 실제 데이터로 비교할 수 있습니다.",
  alternates: {
    canonical: "https://crady.net/ko/portfolio",
    languages: {
      en: "https://crady.net/portfolio",
      ko: "https://crady.net/ko/portfolio",
      "x-default": "https://crady.net/portfolio",
    },
  },
};

export default async function KoreanPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const { ticker } = await searchParams;
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net/ko" },
          { name: "포트폴리오 분석기", url: "https://crady.net/ko/portfolio" },
        ]}
      />
      <h1 className="text-2xl font-bold">ETF 총수익 계산기</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        고배당 커버드콜 ETF를 위한 배당 반영 수익률 계산기입니다. 실제로 매수한 티커, 매수일,
        주식 수 또는 투자금액을 입력하면 현재 평가금액과 매수일 이후 실제로 받을 자격이 있었던
        모든 배당(각 배당의 ex-dividend date 기준)을 더한 실제 총수익을 가격 변동과 분리해서
        확인할 수 있습니다. 이어서 같은 날짜에 동일 금액을 실제 대안 ETF에 투자했다면 어땠을지도
        비교합니다.
      </p>

      <div className="mt-8">
        <PortfolioAnalyzer searchIndex={searchIndex} lang="ko" initialTicker={ticker?.toUpperCase()} />
      </div>

      <div className="mt-12 border-t border-[var(--gray-200)] pt-6">
        <h2 className="text-sm font-bold mb-2">이 계산기가 다른 점</h2>
        <ul className="text-sm text-[var(--gray-600)] space-y-1.5 list-disc pl-5">
          <li>
            <b>가격 수익률과 배당 수익을 항상 분리합니다.</b> 높은 분배율만으로는 실제 가격
            손실이 가려질 수 있어, 두 수치를 하나로 합쳐서만 보여주지 않습니다.
          </li>
          <li>
            <b>단순 날짜 범위가 아닌 ex-dividend date 기준 자격 판정.</b> 이미 ex-dividend가
            지난 후 매수하면 해당 배당을 받을 자격이 없습니다 — 매수일 이후 지급일이 아니라, 각
            배당의 실제 ex-date를 기준으로 판정합니다.
          </li>
          <li>
            <b>동일 주식 수가 아닌 동일 날짜·동일 금액 비교.</b> 대안 ETF 비교는 가격대가 전혀
            다른 상품이라도 동일한 날짜에 동일한 투자금액을 기준으로 계산합니다.
          </li>
          <li>
            <b>실제 배당만 반영, 예측치는 제외.</b> 향후 예측 배당은 과거 수익률 계산에 포함되지
            않습니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
