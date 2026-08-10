import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllAnnouncementSlugs,
  getAnnouncementBySlug,
  getDistributionRowsForAnnouncement,
  getAnnouncementChanges,
} from "@/lib/distributions/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { AnnouncementHeader } from "@/components/distributions/AnnouncementHeader";
import { DistributionExplorer } from "@/components/distributions/DistributionExplorer";
import { AnnouncementInsights } from "@/components/distributions/AnnouncementInsights";
import { RelatedContent } from "@/components/RelatedContent";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

type Params = { slug: string };

export async function generateStaticParams() {
  const slugs = await getAllAnnouncementSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const announcement = await getAnnouncementBySlug(slug);
  if (!announcement) return {};

  const enUrl = `https://crady.net/distributions/${slug}`;
  const koUrl = `https://crady.net/ko/distributions/${slug}`;
  // The announcement's own headline (announcement.title) is a verbatim US
  // press-release quote — always English, by nature of the source. Reusing
  // it as-is for the Korean <title> would duplicate the English page's
  // title tag (a real issue caught by scripts/audit-site-wide-seo.mjs), so
  // the Korean metadata title is a genuinely Korean template instead; the
  // verbatim English headline still appears in the page body via
  // AnnouncementHeader, where quoting the real release text is correct.
  const koTitle = `${announcement.issuer} 분배금 발표 (${announcement.announcement_date}) — ${announcement.etf_count}개 ETF`;
  return {
    title: koTitle,
    description: `${announcement.title} — ${announcement.etf_count}개 ETF에 대한 CRADY 공식 분배금 아카이브.`,
    alternates: {
      canonical: koUrl,
      languages: { en: enUrl, ko: koUrl, "x-default": enUrl },
    },
    openGraph: {
      title: koTitle,
      locale: "ko_KR",
      alternateLocale: "en_US",
    },
  };
}

export default async function KoreanDistributionAnnouncementPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const announcement = await getAnnouncementBySlug(slug);
  if (!announcement) notFound();

  const rows = await getDistributionRowsForAnnouncement(announcement.id);
  const changes = await getAnnouncementChanges(rows);

  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: announcement.title,
    datePublished: announcement.announcement_date,
    dateModified: announcement.fetched_at,
    inLanguage: "ko",
    url: `https://crady.net/ko/distributions/${slug}`,
    author: { "@type": "Organization", name: "CRADY" },
    publisher: { "@type": "Organization", name: "CRADY" },
    isBasedOn: announcement.source_url,
  };

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: "최신 분배금", url: "https://crady.net/ko/distributions" },
          { name: "아카이브", url: "https://crady.net/ko/distributions/archive" },
          { name: announcement.title, url: `https://crady.net/ko/distributions/${slug}` },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd) }} />

      <p className="text-sm">
        <Link href="/ko/distributions/archive" className="text-[var(--gray-500)] hover:text-black">
          ← 아카이브로 돌아가기
        </Link>
      </p>

      <div className="mt-2">
        <AnnouncementHeader announcement={announcement} lang="ko" />
      </div>

      <AnnouncementInsights changes={changes} rows={rows} lang="ko" basePath="/ko" />

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">전체 분배금 표</h2>
        <DistributionExplorer rows={rows} lang="ko" basePath="/ko" />
      </div>

      <RelatedContent
        lang="ko"
        etfs={[...new Set(rows.map((r) => r.ticker))].slice(0, 8).map((ticker) => ({
          href: `/${ticker.toLowerCase()}`,
          label: `${ticker} 전체 ETF 프로필`,
        }))}
        rankings={[{ href: "/ko/distributions/archive", label: "분배금 발표 아카이브" }]}
      />
    </PageShell>
  );
}
