import type { Metadata } from "next";
import { getHomeSnapshot, toSearchIndex, getComparisonPeer } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { CompareView } from "@/components/compare/CompareView";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Compare ETFs Side by Side — CRADY",
  description:
    "Compare any two high-dividend covered-call ETFs card by card: price, annual yield, risk, income, drawdown, and dividend stability.",
  alternates: {
    canonical: "https://crady.net/compare",
    languages: {
      en: "https://crady.net/compare",
      ko: "https://crady.net/ko/compare",
      "x-default": "https://crady.net/compare",
    },
  },
};

export default async function ComparePage({
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
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Compare", url: "https://crady.net/compare" },
        ]}
      />
      <h1 className="text-2xl font-bold">Compare ETFs</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        Pick any two tickers to compare card by card — price, annual yield, CRADY Score, income,
        drawdown, and dividend stability, side by side.
      </p>

      <div className="mt-8">
        <CompareView searchIndex={searchIndex} peerA={peerA} peerB={peerB} tickerA={tickerA} tickerB={tickerB} lang="en" />
      </div>
    </PageShell>
  );
}
