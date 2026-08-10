import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign } from "lucide-react";
import { getNextDividendBoard } from "@/lib/ticker/nextDividendBoard";
import { NextDividendBoard } from "@/components/nextDividend/NextDividendBoard";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PageAppCta } from "@/components/PageAppCta";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Next ETF Dividends & Payment Dates",
  description:
    "Upcoming dividend estimates, announcement dates, ex-dividend dates and payment dates for YieldMax, Roundhill and Defiance covered-call ETFs — confirmed and CRADY-estimated, clearly labeled.",
  alternates: {
    canonical: "https://crady.net/next-dividend",
    languages: {
      en: "https://crady.net/next-dividend",
      ko: "https://crady.net/ko/next-dividend",
      "x-default": "https://crady.net/next-dividend",
    },
  },
  openGraph: {
    title: "Next ETF Dividends & Payment Dates | CRADY",
    description: "See every tracked ETF's next dividend — announcement, ex-dividend, and payment date at a glance.",
    locale: "en_US",
    alternateLocale: "ko_KR",
  },
};

export default async function NextDividendPage() {
  const entries = await getNextDividendBoard();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Next ETF Dividends",
    itemListElement: entries.slice(0, 50).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${e.ticker} next dividend`,
      url: `https://crady.net/${e.ticker.toLowerCase()}`,
    })),
  };

  return (
    <PageShell paddingY="py-8">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Next Dividend", url: "https://crady.net/next-dividend" },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-[var(--crady-accent)]/15 flex items-center justify-center shrink-0">
          <DollarSign size={22} className="text-[#92400e]" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Next Dividend</h1>
          <p className="text-sm text-[var(--gray-600)] mt-0.5">
            See upcoming dividend estimates, announcement dates, ex-dividend dates and payment dates for
            covered-call ETFs.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <NextDividendBoard entries={entries} lang="en" basePath="" />
      </div>

      <div className="mt-8">
        <Link href="/prediction-accuracy" className="text-sm font-semibold text-[#92400e] hover:underline">
          See how accurate CRADY&rsquo;s past predictions have been →
        </Link>
      </div>

      <PageAppCta lang="en" />
    </PageShell>
  );
}
