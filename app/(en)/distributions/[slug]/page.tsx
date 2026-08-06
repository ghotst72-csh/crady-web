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

  const url = `https://crady.net/distributions/${slug}`;
  return {
    title: announcement.title,
    description: `${announcement.title} — official distribution data for ${announcement.etf_count} ETFs, archived by CRADY.`,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        ko: `https://crady.net/ko/distributions/${slug}`,
        "x-default": url,
      },
    },
    openGraph: {
      title: announcement.title,
      locale: "en_US",
      alternateLocale: "ko_KR",
    },
  };
}

export default async function DistributionAnnouncementPage({
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
    inLanguage: "en",
    url: `https://crady.net/distributions/${slug}`,
    author: { "@type": "Organization", name: "CRADY" },
    publisher: { "@type": "Organization", name: "CRADY" },
    isBasedOn: announcement.source_url,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Latest Distributions", url: "https://crady.net/distributions" },
          { name: "Archive", url: "https://crady.net/distributions/archive" },
          { name: announcement.title, url: `https://crady.net/distributions/${slug}` },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd) }} />

      <p className="text-sm">
        <Link href="/distributions/archive" className="text-[var(--gray-500)] hover:text-black">
          ← Back to Archive
        </Link>
      </p>

      <div className="mt-2">
        <AnnouncementHeader announcement={announcement} lang="en" />
      </div>

      <AnnouncementInsights changes={changes} rows={rows} lang="en" basePath="" />

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">Full Distribution Table</h2>
        <DistributionExplorer rows={rows} lang="en" basePath="" />
      </div>

      <RelatedContent
        lang="en"
        etfs={[...new Set(rows.map((r) => r.ticker))].slice(0, 8).map((ticker) => ({
          href: `/${ticker.toLowerCase()}`,
          label: `${ticker} Full ETF Profile`,
        }))}
        guides={[{ href: "/magazine/distribution-schedule-guide", label: "Distribution Schedule Guide" }]}
        rankings={[{ href: "/distributions/archive", label: "Distribution Announcement Archive" }]}
      />
    </div>
  );
}
