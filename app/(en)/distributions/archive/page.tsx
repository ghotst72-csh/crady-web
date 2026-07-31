import type { Metadata } from "next";
import Link from "next/link";
import { getAllAnnouncements } from "@/lib/distributions/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { providerLabel } from "@/lib/providers";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Distribution Announcement Archive",
  description: "Every past official ETF distribution announcement, archived — issuer, date, and full per-ticker detail.",
  alternates: {
    canonical: "https://crady.net/distributions/archive",
    languages: {
      en: "https://crady.net/distributions/archive",
      ko: "https://crady.net/ko/distributions/archive",
      "x-default": "https://crady.net/distributions/archive",
    },
  },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function DistributionArchivePage() {
  const announcements = await getAllAnnouncements();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Latest Distributions", url: "https://crady.net/distributions" },
          { name: "Archive", url: "https://crady.net/distributions/archive" },
        ]}
      />
      <p className="text-sm">
        <Link href="/distributions" className="text-[var(--gray-500)] hover:text-black">
          ← Back to Latest Distributions
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold">Distribution Announcement Archive</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1">
        Every official distribution announcement CRADY has recorded, newest first.
      </p>

      <ul className="mt-6 border border-[var(--gray-200)] rounded-xl divide-y divide-[var(--gray-100)] overflow-hidden">
        {announcements.map((a) => (
          <li key={a.id}>
            <Link
              href={`/distributions/${a.slug}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--gray-50)] transition-colors"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-[var(--gray-500)] mt-0.5">
                  {providerLabel(a.provider_id)} · {formatDate(a.announcement_date)} · {a.etf_count} ETFs
                </div>
              </div>
              <span className="shrink-0 text-[var(--gray-400)]">→</span>
            </Link>
          </li>
        ))}
        {announcements.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-[var(--gray-400)]">No announcements recorded yet.</li>
        )}
      </ul>
    </div>
  );
}
