import type { Metadata } from "next";
import Link from "next/link";
import { getLatestAnnouncement, getDistributionRowsForAnnouncement } from "@/lib/distributions/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { AnnouncementHeader } from "@/components/distributions/AnnouncementHeader";
import { DistributionKpis } from "@/components/distributions/DistributionKpis";
import { DistributionExplorer } from "@/components/distributions/DistributionExplorer";
import { DataExplanations } from "@/components/distributions/DataExplanations";
import { PageAppCta } from "@/components/PageAppCta";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "최신 ETF 분배금 발표: MSTY·TSLY·CONY",
  description:
    "공식 발표된 최신 ETF 분배금 정보를 하나의 정렬·검색 가능한 표에서 확인하세요 — 주당 분배금, 분배율, 30일 SEC 수익률, ROC, 배당락일, 지급일.",
  alternates: {
    canonical: "https://crady.net/ko/distributions",
    languages: {
      en: "https://crady.net/distributions",
      ko: "https://crady.net/ko/distributions",
      "x-default": "https://crady.net/distributions",
    },
  },
  openGraph: {
    title: "최신 ETF 분배금 발표 | CRADY",
    description: "공식 발표된 최신 ETF 분배금 정보를 하나의 정렬·검색 가능한 표에서 확인하세요.",
    locale: "ko_KR",
    alternateLocale: "en_US",
  },
};

export default async function KoreanDistributionsPage() {
  const announcement = await getLatestAnnouncement();
  const rows = announcement ? await getDistributionRowsForAnnouncement(announcement.id) : [];

  const itemListJsonLd = announcement
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: announcement.title,
        inLanguage: "ko",
        itemListElement: rows.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: r.ticker,
          url: `https://crady.net/ko/${r.ticker.toLowerCase()}`,
        })),
      }
    : null;

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: "최신 분배금", url: "https://crady.net/ko/distributions" },
        ]}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}

      <p className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
        CRADY 공식 분배금 센터
      </p>

      {announcement ? (
        <>
          <div className="mt-2">
            <AnnouncementHeader announcement={announcement} rows={rows} lang="ko" variant="hero" />
          </div>
          <div className="mt-6">
            <DistributionKpis rows={rows} lang="ko" />
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-3">전체 발표된 분배금</h2>
            <DistributionExplorer rows={rows} lang="ko" basePath="/ko" />
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-[var(--gray-500)]">아직 공식 분배금 발표 데이터가 없습니다.</p>
      )}

      <p className="mt-6 text-sm">
        <Link href="/ko/distributions/archive" className="text-[#92400e] hover:underline font-medium">
          지난 발표 전체 보기 →
        </Link>
      </p>

      <DataExplanations lang="ko" />
      <PageAppCta lang="ko" />
    </PageShell>
  );
}
