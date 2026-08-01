import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { GooglePlayButton } from "@/components/GooglePlayButton";
import { AppStoreBadge } from "@/components/AppStoreBadge";

export const metadata: Metadata = {
  title: "About & Data Methodology",
  description:
    "CRADY is a high dividend ETF information site. How we calculate dividend predictions and CRADY scores, our data sources, and our update policy — fully transparent.",
  alternates: {
    canonical: "https://crady.net/about",
    languages: {
      en: "https://crady.net/about",
      ko: "https://crady.net/ko/about",
      "x-default": "https://crady.net/about",
    },
  },
};

const REASONS = [
  {
    title: "Actual Payment Data",
    desc: "Annualized distribution yield is calculated from the trailing 90-day run-rate of actually paid dividends — not an issuer's projected yield.",
  },
  {
    title: "CRADY Score",
    desc: "Compares ETFs on a score that factors in volatility and dividend stability, not just yield alone.",
  },
  {
    title: "Next Dividend Prediction",
    desc: "See the predicted next dividend amount, payment date, and confidence score, based on past payment patterns.",
  },
];

const COMPARISON: { item: string; web: string; app: string }[] = [
  { item: "ETF Data Lookup", web: "Yes", app: "Yes" },
  { item: "Dividend Calendar", web: "Yes", app: "Yes" },
  { item: "Watchlist & Alerts", web: "—", app: "Yes" },
  { item: "Portfolio Tracking", web: "—", app: "Yes" },
  { item: "AI ETF Finder", web: "—", app: "Yes" },
  { item: "Personal Reports", web: "—", app: "Yes" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "About", url: "https://crady.net/about" },
        ]}
      />
      <h1 className="text-2xl font-bold">About CRADY</h1>
      <p className="mt-3 text-[var(--gray-600)] text-sm leading-relaxed">
        CRADY is a website for tracking dividend schedules, prices, estimated next dividends, and
        risk for high-dividend covered-call ETFs from YieldMax, Roundhill, Defiance, and others —
        and the official home for the CRADY mobile app.
      </p>

      <h2 className="mt-10 text-lg font-bold">Why CRADY</h2>
      <div className="mt-4 space-y-5">
        {REASONS.map((r) => (
          <div key={r.title}>
            <div className="font-semibold text-sm">{r.title}</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold">Web vs. App</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)]">
        Look things up on the web, manage them in the app — CRADY web lets anyone check ETF data
        quickly with no login required; personalized management features live in the app.
      </p>
      <div className="mt-4 border border-[var(--gray-200)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Feature</th>
              <th className="text-center px-4 py-2 font-medium">Web</th>
              <th className="text-center px-4 py-2 font-medium">App</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            {COMPARISON.map((row, i) => (
              <tr
                key={row.item}
                className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
              >
                <td className="px-4 py-2.5">{row.item}</td>
                {/* gray-600/#92400e, not gray-400/--crady-accent — see
                    components/ui/KpiCard.tsx for why. */}
                <td className="px-4 py-2.5 text-center text-[var(--gray-600)]">{row.web}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-[#92400e]">
                  {row.app}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 border border-[var(--gray-200)] rounded-2xl bg-[var(--gray-50)] p-6">
        <h2 className="text-lg font-bold">Get the CRADY App</h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">
          Watchlists, dividend alerts, and portfolio tracking — free in the CRADY app.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <GooglePlayButton lang="en" />
          <AppStoreBadge lang="en" />
        </div>
      </div>

      <div id="methodology" className="mt-12 pt-2 scroll-mt-20">
        <h2 className="text-lg font-bold">Data &amp; Prediction Methodology</h2>
        <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
          Every number on CRADY is computed automatically by rule-based logic below — never
          hand-written or guessed. Here&apos;s exactly how each figure is derived.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <div className="font-semibold text-sm">Annual Distribution Yield</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              We sum the actual dividends paid over the trailing 90 days, divide by 90 for a daily
              average, multiply by 365, and divide by the current price — a &quot;run-rate&quot; from real
              payments. This is not an issuer&apos;s projected yield, so the figure moves as actual
              payments change.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">Next Dividend Prediction</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              Computed one of two ways. ① When the issuer has officially published its next
              payment schedule, we use that date combined with a weighted average of recent actual
              payments. ② When no official schedule exists, we estimate the next date from the
              statistical pattern (interval and median) of past payments. Either way, a prediction
              is only shown when there&apos;s enough underlying data — every prediction is labeled with
              a confidence score and its calculation method.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">CRADY Score &amp; Risk Level</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              Combines recent price volatility (30-day/90-day), maximum drawdown, and how
              consistent the per-payment dividend amount has been (dividend stability score). A
              high yield alone doesn&apos;t raise the CRADY score — high volatility or irregular
              dividends lower it by design. It&apos;s a backward-looking metric and doesn&apos;t guarantee
              future performance.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">Data Sources</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              Prices, dividend payment history, and payment schedules are collected from each
              ETF issuer&apos;s public disclosures and public market data.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">Update Frequency</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              Prices, dividend history, predictions, and CRADY scores for every ETF refresh
              automatically once a day through an automated pipeline — no manual editing of any
              individual figure. The &quot;Updated&quot; timestamp on each ETF page is the real time that
              data was last calculated.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-bold">Disclaimer</h2>
        <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
          Every figure CRADY provides (annualized distribution yield, CRADY score, next dividend
          prediction, and others) is a statistical estimate based on historical data, not
          investment advice or financial guidance. In particular, dividend predictions are
          estimates, not confirmed facts — actual payment dates and amounts can differ from an
          issuer&apos;s official announcement. You are solely responsible for your own investment
          decisions and their outcomes. See our Privacy Policy and Terms of Service for details on
          data handling and service use.
        </p>
      </div>
    </div>
  );
}
