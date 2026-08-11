import type { Metadata } from "next";
import Link from "next/link";
import { getHomeSnapshot, toSearchIndex } from "@/lib/data";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PageShell } from "@/components/layout/PageShell";
import { PageAppCta } from "@/components/PageAppCta";
import { PageTrustFooter } from "@/components/seo/PageTrustFooter";
import { EtfCalculator } from "@/components/etfCalculator/EtfCalculator";
import { buildWebPageJsonLd, buildFaqJsonLd } from "@/lib/magazine/jsonld";
import type { FaqItem } from "@/lib/magazine/types";

export const revalidate = 3600;

const PAGE_URL = "https://crady.net/etf-calculator";
const TITLE = "ETF Calculator | Historical ETF Return Calculator";
const DESCRIPTION =
  "Calculate what an ETF investment actually returned. Pick a real CRADY-tracked ETF, a purchase date, and a sale date — CRADY looks up the real historical prices and distributions and shows your actual total return.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do you calculate historical ETF returns?",
    answer:
      "CRADY looks up the ETF's real recorded closing price on your purchase date (or the nearest prior trading day) to work out how many shares your investment would have bought, then looks up the real price on your sale date for the ending share value. Every distribution the fund actually paid with an ex-dividend date inside your holding period is added on top. Total return = (ending share value + distributions received − initial investment) ÷ initial investment. Nothing here is estimated or projected — it's what actually happened.",
  },
  {
    question: "How does CRADY handle weekends and market holidays?",
    answer:
      "If you pick a date the market was closed, CRADY uses the closing price from the nearest prior trading day and clearly labels the date as adjusted, right under the date field and again in the results. It never uses a future price for a past date.",
  },
  {
    question: "What happens if I reinvest distributions (DRIP)?",
    answer:
      "With DRIP off (the default), each distribution is treated as cash received on top of your share value. With DRIP on, every eligible distribution is used to buy more (fractional) shares at that distribution's real ex-dividend-date price, the same way a brokerage dividend reinvestment plan works — so later distributions and the final sale are paid on a larger share count. DRIP based on real historical prices, not an assumed rate.",
  },
  {
    question: "How does CRADY handle stock splits and reverse splits?",
    answer:
      "CRADY's price history isn't stored with split-ratio metadata, so an unrecorded split would otherwise silently distort a return calculation. Before showing a result, CRADY scans the price history across your exact holding period for a single-day price move large enough to be split-shaped. If one is found, CRADY shows you the flagged date instead of a number it can't verify — it will never quietly show a return built on a broken price series.",
  },
  {
    question: "Why do YieldMax and other high-distribution ETFs need this kind of calculator?",
    answer:
      "A high distribution rate is not the same as a high total return — a fund's share price can fall even while it pays large distributions. This calculator's whole point is showing both halves side by side: how much the share value actually changed, and how much cash the distributions actually added, so you can see whether one offset the other.",
  },
];

const METHODOLOGY: { title: string; body: string }[] = [
  { title: "Real prices, not estimates", body: "Purchase and sale prices come directly from CRADY's recorded daily closing prices for the selected ETF — the same price history used throughout CRADY." },
  { title: "Non-trading days", body: "A purchase or sale date that wasn't a trading day snaps to the nearest prior trading day, and the adjustment is always shown." },
  { title: "Distribution eligibility", body: "A distribution counts only if its ex-dividend date falls on or after your (adjusted) purchase date and on or before your (adjusted) sale date — the same eligibility rule used by CRADY's Portfolio Analyzer." },
  { title: "Fractional shares", body: "Shares purchased = investment amount ÷ purchase price, with no rounding, so the dollar amount you enter is fully invested." },
  { title: "DRIP methodology", body: "When Reinvest Distributions is on, each eligible distribution buys additional shares at that distribution's real ex-dividend-date closing price — walked chronologically, so each reinvestment compounds on the growing share count." },
  { title: "Split protection", body: "The exact holding period is scanned for a split-shaped price discontinuity before any number is shown. If one is found, CRADY withholds the result rather than risk a distorted number." },
  { title: "Taxes are excluded", body: "This tool shows pre-tax total return only. It does not model your account type, tax bracket, or how a fund's distributions are characterized (ordinary income, qualified, or return of capital)." },
];

export default async function EtfCalculatorPage() {
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  const webPageJsonLd = buildWebPageJsonLd({ name: "Historical ETF Return Calculator", description: DESCRIPTION, url: PAGE_URL });
  const faqJsonLd = buildFaqJsonLd(FAQ_ITEMS);

  return (
    <PageShell paddingY="py-8">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "https://crady.net" }, { name: "ETF Calculator", url: PAGE_URL }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <nav aria-label="Breadcrumb" className="text-xs text-[var(--gray-600)] mb-3">
        <Link href="/" className="hover:text-black">Home</Link> <span aria-hidden="true">/</span>{" "}
        <span className="text-[var(--gray-900)]">ETF Calculator</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">ETF Return Calculator</h1>
      <p className="mt-2 text-[15px] sm:text-base text-[var(--gray-600)] max-w-2xl">
        Pick a real ETF, a purchase date, and a sale date. CRADY looks up the actual historical prices and every
        distribution paid in between — no projections, no assumptions.
      </p>

      <div className="mt-6">
        <EtfCalculator searchIndex={searchIndex} />
      </div>

      {/* ---- Methodology ---- */}
      <section id="how-this-works" className="mt-10 scroll-mt-20">
        <details className="group border border-[var(--gray-200)] rounded-xl p-4 sm:p-5">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-bold text-sm text-[var(--gray-900)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]">
            How This Calculation Works
            <span className="shrink-0 text-[var(--gray-400)] transition-transform group-open:rotate-45 text-lg leading-none">+</span>
          </summary>
          <div className="mt-4 space-y-3">
            {METHODOLOGY.map((a) => (
              <div key={a.title}>
                <div className="text-sm font-semibold text-[var(--gray-800)]">{a.title}</div>
                <p className="text-sm text-[var(--gray-600)] mt-0.5 leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* ---- SEO content ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">Historical ETF Return Calculator: Common Questions</h2>
        <div className="not-prose max-w-3xl divide-y divide-[var(--gray-100)] border-t border-[var(--gray-100)]">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 py-3 font-semibold text-sm text-[var(--gray-900)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]">
                {item.question}
                <span className="shrink-0 text-[var(--gray-400)] transition-transform group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <p className="pb-3 text-sm text-[var(--gray-600)] leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 border border-[var(--gray-200)] rounded-xl bg-[var(--gray-50)] p-5 sm:p-6">
        <div className="font-bold text-base">Managing More Than One ETF?</div>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          The Portfolio Analyzer runs this same real-data return calculation across your entire portfolio at once,
          with alternative-ETF comparisons and a full health score.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/portfolio" className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-[var(--gray-800)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] focus-visible:ring-offset-2">
            Open Portfolio Analyzer →
          </Link>
          <Link href="/ranking" className="px-4 py-2 rounded-full border border-[var(--gray-300)] text-sm font-semibold hover:border-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] focus-visible:ring-offset-2">
            Explore ETF Rankings →
          </Link>
        </div>
      </section>

      <p className="mt-8 pt-6 border-t border-[var(--gray-200)] text-xs text-[var(--gray-500)] leading-relaxed">
        This calculator is for educational purposes only and is not investment advice. It shows real historical
        performance for the exact dates selected — past performance does not guarantee future results.
      </p>

      <PageAppCta lang="en" />
      <PageTrustFooter lang="en" />
    </PageShell>
  );
}
