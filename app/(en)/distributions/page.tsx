import type { Metadata } from "next";
import Link from "next/link";
import { getLatestAnnouncement, getDistributionRowsForAnnouncement } from "@/lib/distributions/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { AnnouncementHeader } from "@/components/distributions/AnnouncementHeader";
import { DistributionExplorer } from "@/components/distributions/DistributionExplorer";
import { DataExplanations } from "@/components/distributions/DataExplanations";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Latest ETF Distributions: MSTY, TSLY, CONY and More",
  description:
    "The latest officially announced ETF distributions in one sortable, searchable table — distribution per share, distribution rate, 30-Day SEC yield, ROC, ex-date, and payment date.",
  alternates: {
    canonical: "https://crady.net/distributions",
    languages: {
      en: "https://crady.net/distributions",
      ko: "https://crady.net/ko/distributions",
      "x-default": "https://crady.net/distributions",
    },
  },
  openGraph: {
    title: "Latest ETF Distributions | CRADY",
    description: "The latest officially announced ETF distributions in one sortable, searchable table.",
    locale: "en_US",
    alternateLocale: "ko_KR",
  },
};

export default async function DistributionsPage() {
  const announcement = await getLatestAnnouncement();
  const rows = announcement ? await getDistributionRowsForAnnouncement(announcement.id) : [];

  const itemListJsonLd = announcement
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: announcement.title,
        inLanguage: "en",
        itemListElement: rows.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: r.ticker,
          url: `https://crady.net/${r.ticker.toLowerCase()}`,
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Latest Distributions", url: "https://crady.net/distributions" },
        ]}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}

      <p className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
        CRADY Official Distribution Center
      </p>
      <h1 className="sr-only">Latest Official Distributions</h1>

      {announcement ? (
        <>
          <div className="mt-2">
            <AnnouncementHeader announcement={announcement} lang="en" />
          </div>
          <div className="mt-6">
            <DistributionExplorer rows={rows} lang="en" basePath="" />
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-[var(--gray-500)]">
          No official distribution announcements are available yet.
        </p>
      )}

      <p className="mt-6 text-sm">
        <Link href="/distributions/archive" className="text-[var(--crady-accent)] hover:underline font-medium">
          View all past announcements →
        </Link>
      </p>

      <DataExplanations lang="en" />
    </div>
  );
}
