import type { Metadata } from "next";
import Link from "next/link";
import { getLatestAnnouncement, getDistributionRowsForAnnouncement } from "@/lib/distributions/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { AnnouncementHeader } from "@/components/distributions/AnnouncementHeader";
import { DistributionKpis } from "@/components/distributions/DistributionKpis";
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

      {announcement ? (
        <>
          <div className="mt-2">
            <AnnouncementHeader announcement={announcement} rows={rows} lang="en" variant="hero" />
          </div>
          <div className="mt-6">
            <DistributionKpis rows={rows} lang="en" />
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-3">All Announced Distributions</h2>
            <DistributionExplorer rows={rows} lang="en" basePath="" />
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-[var(--gray-500)]">
          No official distribution announcements are available yet.
        </p>
      )}

      <p className="mt-6 text-sm">
        <Link href="/distributions/archive" className="text-[#92400e] hover:underline font-medium">
          View all past announcements →
        </Link>
      </p>

      <DataExplanations lang="en" />
    </div>
  );
}
