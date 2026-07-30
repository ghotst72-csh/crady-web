import Link from "next/link";
import type { Metadata } from "next";
import { getHomeSnapshot, providerLabel, type EtfSnapshot } from "@/lib/data";
import { articleSlug } from "@/lib/magazine/recipes";
import { HUB_DEFINITIONS } from "@/lib/magazine/hubs";
import { CALENDAR_HUB_DEFINITIONS } from "@/lib/magazine/calendarHubs";
import { STANDALONE_PAGES } from "@/lib/magazine/standalone";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { ArticleCard } from "@/components/magazine/ArticleCard";

export const revalidate = 3600;

const TITLE = "CRADY Magazine | ETF Dividend Guides & Next Dividend Predictions";
const DESCRIPTION =
  "Data-driven ETF dividend guides, next dividend predictions, and risk analysis for YieldMax, Roundhill and Defiance covered-call ETFs — auto-generated and kept up to date by CRADY.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://crady.net/magazine" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://crady.net/magazine", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function nextDividendCard(etf: EtfSnapshot) {
  return (
    <ArticleCard
      key={etf.ticker}
      href={`/magazine/${articleSlug(etf.ticker, "next-dividend-prediction")}`}
      title={`${etf.ticker} Next Dividend Prediction`}
      description={`${providerLabel(etf.provider_id)}${
        etf.annualYieldPct != null ? ` · ${etf.annualYieldPct.toFixed(1)}% est. yield` : ""
      }`}
      imageSrc={`/${etf.ticker.toLowerCase()}/opengraph-image`}
    />
  );
}

function dividendGuideCard(etf: EtfSnapshot) {
  return (
    <ArticleCard
      key={etf.ticker}
      href={`/magazine/${articleSlug(etf.ticker, "dividend-guide")}`}
      title={`${etf.ticker} Dividend Guide`}
      description={`${providerLabel(etf.provider_id)} · Distribution history, yield & payout frequency`}
      imageSrc={`/${etf.ticker.toLowerCase()}/opengraph-image`}
    />
  );
}

export default async function MagazineIndexPage() {
  const snapshot = await getHomeSnapshot();
  const byYield = [...snapshot]
    .filter((e) => e.annualYieldPct != null)
    .sort((a, b) => b.annualYieldPct! - a.annualYieldPct!);
  // "Latest" as in "paying soonest" — every ticker's risk data is recomputed
  // by the same nightly pipeline run, so calculatedAt ties across nearly all
  // of them and isn't a meaningful freshness signal on its own. Upcoming pay
  // date is a genuinely distinct, useful ordering from the yield-sorted rails.
  const byUpcoming = [...snapshot]
    .filter((e) => e.nextPredictedDate != null)
    .sort((a, b) => (a.nextPredictedDate! < b.nextPredictedDate! ? -1 : 1));

  const featured = byYield[0];
  const latest = byUpcoming.slice(0, 6);
  const weekly = snapshot.filter((e) => e.payoutFrequency === "weekly").sort((a, b) => (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1)).slice(0, 4);
  const monthly = snapshot.filter((e) => e.payoutFrequency === "monthly").sort((a, b) => (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1)).slice(0, 4);
  const yieldmax = snapshot.filter((e) => e.provider_id === "yieldmax").sort((a, b) => (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1)).slice(0, 4);
  const roundhill = snapshot.filter((e) => e.provider_id === "roundhill").sort((a, b) => (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1)).slice(0, 4);
  const defiance = snapshot.filter((e) => e.provider_id === "defiance").sort((a, b) => (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1)).slice(0, 4);
  const guides = byYield.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Magazine", url: "https://crady.net/magazine" },
        ]}
      />

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">CRADY Magazine</h1>
      <p className="mt-2 text-sm sm:text-base text-[var(--gray-600)] max-w-2xl">
        Data-driven ETF dividend guides, next dividend predictions, and risk analysis —
        auto-generated from CRADY&apos;s data pipeline and kept up to date automatically.
      </p>

      {featured && (
        <section className="mt-8">
          <h2 className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">
            Featured
          </h2>
          <div className="max-w-md">{nextDividendCard(featured)}</div>
        </section>
      )}

      {latest.length > 0 && (
        <CategorySection title="Paying Soon" items={latest.map(nextDividendCard)} />
      )}

      {weekly.length > 0 && (
        <CategorySection
          title="Weekly Dividend ETFs"
          items={weekly.map(nextDividendCard)}
          moreHref="/magazine/weekly-dividend-etfs"
        />
      )}

      {monthly.length > 0 && (
        <CategorySection
          title="Monthly Dividend ETFs"
          items={monthly.map(nextDividendCard)}
          moreHref="/magazine/monthly-dividend-etfs"
        />
      )}

      {yieldmax.length > 0 && (
        <CategorySection
          title="YieldMax ETFs"
          items={yieldmax.map(nextDividendCard)}
          moreHref="/magazine/yieldmax-etfs"
        />
      )}

      {roundhill.length > 0 && (
        <CategorySection
          title="Roundhill ETFs"
          items={roundhill.map(nextDividendCard)}
          moreHref="/magazine/roundhill-etfs"
        />
      )}

      {defiance.length > 0 && (
        <CategorySection
          title="Defiance ETFs"
          items={defiance.map(nextDividendCard)}
          moreHref="/magazine/defiance-etfs"
        />
      )}

      {guides.length > 0 && (
        <CategorySection title="ETF Guides" items={guides.map(dividendGuideCard)} />
      )}

      <section className="mt-10 pt-8 border-t border-[var(--gray-200)]">
        <h2 className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">
          Rankings
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(HUB_DEFINITIONS).map((def) => (
            <Link
              key={def.slug}
              href={`/magazine/${def.slug}`}
              className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              {def.h1}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">
          Calendars
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(CALENDAR_HUB_DEFINITIONS).map((def) => (
            <Link
              key={def.slug}
              href={`/magazine/${def.slug}`}
              className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              {def.h1}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-3">
          Guides
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(STANDALONE_PAGES).map((def) => (
            <Link
              key={def.slug}
              href={`/magazine/${def.slug}`}
              className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              {def.h1}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function CategorySection({
  title,
  items,
  moreHref,
}: {
  title: string;
  items: React.ReactNode[];
  moreHref?: string;
}) {
  return (
    <section className="mt-10 pt-8 border-t border-[var(--gray-200)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="text-sm text-[var(--gray-500)] hover:text-black">
            View all →
          </Link>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{items}</div>
    </section>
  );
}
