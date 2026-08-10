import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Data & Usage Terms",
  description:
    "What the historical dividend data on CRADY is, who owns it, what you may do with it, and how to request a license for commercial or bulk use.",
  alternates: { canonical: "https://crady.net/data-terms" },
};

export default function DataTermsPage() {
  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Data & Usage Terms", url: "https://crady.net/data-terms" },
        ]}
      />
      {/* One long-form reading column top to bottom — see about/page.tsx. */}
      <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Data &amp; Usage Terms</h1>
      <p className="mt-3 text-[var(--gray-600)] text-sm leading-relaxed">
        This page describes what the dividend, price, and prediction data shown on CRADY is,
        who owns it, and what you may do with it. It applies to the historical distribution
        tables and other data tables published across crady.net, including the pages that mark
        that data up as a structured dataset for search engines.
      </p>

      <h2 className="mt-10 text-lg font-bold">What this data is</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        CRADY&apos;s data is a mixture of two distinct kinds of information:
      </p>
      <ul className="mt-3 space-y-3 text-sm text-[var(--gray-600)] leading-relaxed list-disc pl-5">
        <li>
          <span className="font-semibold text-[var(--gray-800)]">Third-party market and issuer data.</span>{" "}
          Ex-dividend dates, payment dates, per-share distribution amounts, and prices are
          collected from each ETF issuer&apos;s public disclosures and public market data. CRADY did
          not originate these facts and does not claim ownership of them.
        </li>
        <li>
          <span className="font-semibold text-[var(--gray-800)]">CRADY-generated calculations.</span>{" "}
          Annualized distribution yield, the CRADY Score, risk level, and next dividend
          predictions are computed by CRADY from the underlying data using the rule-based
          methodology described on the{" "}
          <Link href="/about#methodology" className="underline hover:text-black">
            About &amp; Data Methodology
          </Link>{" "}
          page. These figures, and CRADY&apos;s specific compilation and presentation of the
          underlying facts into the tables shown on this site, are CRADY&apos;s own work product.
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-bold">Permitted use</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        You may view, reference, and share individual figures or pages from CRADY for personal,
        informational, editorial, or non-commercial research use, including linking to or
        quoting a specific data point (for example, a single ETF&apos;s next predicted dividend) with
        attribution.
      </p>

      <h2 className="mt-10 text-lg font-bold">Prohibited use</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        Without CRADY&apos;s prior written permission, you may not:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--gray-600)] leading-relaxed list-disc pl-5">
        <li>Systematically scrape, crawl, or bulk-download CRADY&apos;s compiled tables or pages.</li>
        <li>Redistribute, resell, sublicense, or republish CRADY&apos;s compiled data tables, CRADY
          Scores, risk levels, or dividend predictions as a dataset, feed, or product of your own.</li>
        <li>Represent CRADY&apos;s calculations or predictions as official figures published by an
          ETF issuer, or otherwise obscure that they are CRADY&apos;s own estimates.</li>
      </ul>

      <h2 className="mt-10 text-lg font-bold">Third-party data ownership</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        The underlying dividend and price facts referenced above originate from ETF issuers and
        public market data sources, not from CRADY. CRADY cannot and does not grant any license
        to that underlying third-party data beyond what its original source permits — this page
        licenses only CRADY&apos;s own compilation, formatting, and calculations built on top of it.
      </p>

      <h2 className="mt-10 text-lg font-bold">Attribution</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        If you publish or share CRADY&apos;s calculated figures (CRADY Score, risk level, predicted
        dividend amount, or similar) outside of crady.net, credit &quot;CRADY (crady.net)&quot; and link
        back to the relevant page where reasonably possible.
      </p>

      <h2 className="mt-10 text-lg font-bold">No warranty</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        All data and calculations are provided &quot;as is,&quot; without warranty of any kind, express or
        implied, including accuracy, completeness, or fitness for a particular purpose.
      </p>

      <h2 className="mt-10 text-lg font-bold">Data delays and accuracy</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        Prices and dividend data may be delayed and can differ from real-time sources. Next
        dividend predictions, CRADY Scores, and risk levels are statistical estimates based on
        historical data, not confirmed facts — actual payment dates and amounts can differ from
        what CRADY predicts or from an issuer&apos;s eventual official announcement. None of this is
        investment advice. See the{" "}
        <Link href="/about#methodology" className="underline hover:text-black">
          methodology
        </Link>{" "}
        page for how each figure is calculated.
      </p>

      <h2 className="mt-10 text-lg font-bold">Licensing and commercial use</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
        For bulk access, API access, commercial redistribution, or any use beyond what&apos;s
        permitted above, contact{" "}
        <a href="mailto:forgeapps.lab@gmail.com" className="underline hover:text-black">
          forgeapps.lab@gmail.com
        </a>{" "}
        to discuss licensing.
      </p>

      <p className="mt-10 text-xs text-[var(--gray-500)] leading-relaxed">
        This page supplements, and does not replace, CRADY&apos;s{" "}
        <Link href="/terms" className="underline hover:text-black">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-black">
          Privacy Policy
        </Link>
        .
      </p>
      </div>
    </PageShell>
  );
}
