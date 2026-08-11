import type { Metadata } from "next";
import Link from "next/link";
import { getHomeSnapshot, toSearchIndex } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PortfolioAnalyzer } from "@/components/portfolio/PortfolioAnalyzer";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ETF Total Return Calculator — Portfolio Analyzer",
  description:
    "Calculate your real, dividend-adjusted total return on any high-dividend covered-call ETF. See price return vs. distribution income separately, and compare against real alternative ETFs bought on the same date.",
  alternates: {
    canonical: "https://crady.net/portfolio",
    languages: {
      en: "https://crady.net/portfolio",
      ko: "https://crady.net/ko/portfolio",
      "x-default": "https://crady.net/portfolio",
    },
  },
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string }>;
}) {
  const { ticker } = await searchParams;
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Portfolio Analyzer", url: "https://crady.net/portfolio" },
        ]}
      />
      <h1 className="text-2xl font-bold">ETF Total Return Calculator</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        A dividend-adjusted return calculator for high-dividend covered-call ETFs. Enter what you
        actually bought — the ticker, purchase date, and shares or amount invested — and see your
        real total return: current value plus every distribution you were actually entitled to
        (based on each payment&apos;s ex-dividend date), separated from raw price movement. Then
        compare it against what the same money would have returned in a real alternative ETF
        bought on the exact same date.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/etf-calculator" className="text-[#92400e] hover:underline font-medium">
          Want to project future growth instead of looking back? Try the ETF Calculator →
        </Link>
      </p>

      <div className="mt-8">
        <PortfolioAnalyzer searchIndex={searchIndex} lang="en" initialTicker={ticker?.toUpperCase()} />
      </div>

      <div className="mt-12 border-t border-[var(--gray-200)] pt-6">
        <h2 className="text-sm font-bold mb-2">What this calculator does differently</h2>
        <ul className="text-sm text-[var(--gray-600)] space-y-1.5 list-disc pl-5">
          <li>
            <b>Price return vs. dividend income, always separate.</b> A high distribution yield
            alone can mask a real price loss — this tool never combines the two into one number
            without showing both parts.
          </li>
          <li>
            <b>Ex-dividend-date eligibility, not just date range.</b> Buying after a fund has
            already gone ex-dividend doesn&apos;t entitle you to that payment — this calculator
            checks each distribution&apos;s actual ex-date against your purchase date, not just
            whether it falls after the day you bought.
          </li>
          <li>
            <b>Purchase-date comparison, not share-count comparison.</b> The alternative-ETF
            comparison uses the same dollar amount on the same date — not the same number of
            shares of a completely different, differently-priced fund.
          </li>
          <li>
            <b>Only real distributions, never forecasts.</b> Future predicted dividends are
            excluded from every historical return calculation.
          </li>
        </ul>
      </div>
    </PageShell>
  );
}
