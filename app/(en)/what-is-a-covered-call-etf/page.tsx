import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PageShell } from "@/components/layout/PageShell";
import { CoveredCallMediaTabs } from "@/components/learn/CoveredCallMediaTabs";
import { buildWebPageJsonLd, buildFaqJsonLd } from "@/lib/magazine/jsonld";
import type { FaqItem } from "@/lib/magazine/types";

const PAGE_URL = "https://crady.net/what-is-a-covered-call-etf";
const TOON_SRC = "/learn/covered-call/covered-call-toon.png";
// Drop a real file at this path and the Video tab automatically swaps the
// "coming soon" placeholder for a real <video> player — no other change
// needed (see the file-existence check below).
const VIDEO_SRC = "/learn/covered-call/covered-call-explainer.mp4";
const TITLE = "What Is a Covered Call ETF? Simple Guide + Synthetic Covered Calls";
const DESCRIPTION =
  "Learn what a covered call ETF is, how covered calls generate income, how synthetic covered calls differ, and why high distributions can come with limited upside and substantial downside risk.";
// This page has no per-request dynamic data (unlike ticker pages), so
// there's no real timestamp to derive dateModified from automatically --
// update this constant when the editorial content below the Toon/Video is
// next revised, rather than fabricating a live "now()" for a page that
// isn't actually regenerated per request.
const LAST_CONTENT_UPDATE = "2026-08-17";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "article",
    locale: "en_US",
    images: [{ url: TOON_SRC, width: 1536, height: 1024 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

type ComparisonRow = { aspect: string; traditional: string; synthetic: string };

const COMPARISON_ROWS: ComparisonRow[] = [
  { aspect: "Own underlying asset?", traditional: "Usually yes", synthetic: "Not necessarily" },
  { aspect: "Exposure", traditional: "Direct ownership", synthetic: "Options can create stock-like exposure" },
  {
    aspect: "Income",
    traditional: "Call-option premiums",
    synthetic: "Option-selling strategies such as calls or call spreads, depending on the fund",
  },
  { aspect: "Upside", traditional: "May be limited by sold calls", synthetic: "May be limited by the option structure" },
  {
    aspect: "Downside",
    traditional: "The underlying asset can still fall substantially",
    synthetic: "Synthetic exposure can also suffer substantial losses",
  },
  { aspect: "Complexity", traditional: "Lower", synthetic: "Higher" },
];

const BEFORE_INVESTING_QUESTIONS = [
  "What asset am I actually exposed to?",
  "Does the fund own it directly or synthetically?",
  "How much upside is being sold away?",
  "Am I looking at distribution yield — or total return?",
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is a covered call ETF?",
    answer:
      "A covered call ETF holds an underlying asset — a stock, an index, or a basket of stocks — and sells (\"writes\") call options against that holding. The premium collected from selling those options is the main source of the fund's often very high distributions.",
  },
  {
    question: "How does a covered call ETF make money?",
    answer:
      "It collects option premium upfront when it sells call options, regardless of what the underlying does afterward. That premium, combined with any price return or loss on the underlying position, makes up the fund's total performance.",
  },
  {
    question: "Do covered call ETFs pay dividends?",
    answer:
      "Not exactly — most covered call ETFs pay \"distributions,\" not dividends in the traditional sense. A dividend is normally a company sharing its own earnings; a covered call ETF's distributions are mainly funded by option premium income, plus any dividends its underlying holdings happen to pay. The two words get used interchangeably in everyday conversation, but the underlying source of the cash is different.",
  },
  {
    question: "What is a synthetic covered call ETF?",
    answer:
      "A fund that creates stock-like exposure using options — typically a combination of long calls and short puts — instead of directly owning the underlying shares, then sells calls or call spreads against that synthetic position to generate income.",
  },
  {
    question: "What is the difference between a covered call and a synthetic covered call?",
    answer:
      "A traditional covered call fund usually owns the underlying shares outright and sells calls against them. A synthetic covered call fund builds stock-like exposure entirely out of options instead of owning the shares, then sells calls or call spreads against that synthetic position.",
  },
  {
    question: "Can a covered call ETF lose money?",
    answer:
      "Yes. Selling calls caps some upside, but it doesn't remove downside risk — if the underlying asset (or the fund's synthetic exposure to it) falls substantially, the fund's share price can fall substantially too, even while it keeps paying distributions.",
  },
  {
    question: "Why do covered call ETFs have high distribution yields?",
    answer:
      "Their distributions are largely funded by option premium income, which can be substantial — especially on volatile underlyings, since higher volatility generally means richer option premiums. A high distribution reflects that premium income, not necessarily strong total investment performance.",
  },
  {
    question: "Are all YieldMax ETFs synthetic covered call ETFs?",
    answer:
      "No. Most YieldMax funds do use a synthetic covered call strategy, but the exact option structure varies fund to fund — some use call spreads or other option-income structures instead. Check each specific fund's own strategy rather than assuming every YieldMax product works identically.",
  },
  {
    question: "Do covered call ETFs perform well when stocks rise?",
    answer:
      "Not necessarily as well as owning the underlying directly. Because sold calls cap upside beyond a strike price, a covered call fund typically captures less of a sharp rally than the underlying asset itself, in exchange for the option income it collected.",
  },
  {
    question: "Are covered call ETFs good for long-term investing?",
    answer:
      "It depends on the objective. If the goal is current income and the investor understands that upside can be capped and the underlying can still decline, a covered call ETF can fit that objective. If the goal is maximizing long-term total return, it's worth comparing the fund's actual total return — not just its distribution rate — against simpler alternatives, since capped upside can be a real long-term trade-off.",
  },
];

export default function CoveredCallLandingPage() {
  const videoExists = fs.existsSync(
    path.join(process.cwd(), "public", "learn", "covered-call", "covered-call-explainer.mp4")
  );

  const webPageJsonLd = {
    ...buildWebPageJsonLd({
      name: "What Is a Covered Call ETF?",
      description: DESCRIPTION,
      url: PAGE_URL,
      speakableSelectors: ["#quick-summary"],
    }),
    dateModified: LAST_CONTENT_UPDATE,
  };
  const faqJsonLd = buildFaqJsonLd(FAQ_ITEMS);

  return (
    <PageShell paddingY="py-8">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "https://crady.net" }, { name: "What Is a Covered Call ETF?", url: PAGE_URL }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <nav aria-label="Breadcrumb" className="text-xs text-[var(--gray-600)] mb-3">
        <span>Learn</span> <span aria-hidden="true">/</span>{" "}
        <span className="text-[var(--gray-900)]">What Is a Covered Call ETF?</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">What Is a Covered Call ETF?</h1>
      <p className="mt-2 text-[15px] sm:text-base text-[var(--gray-600)]">
        Understand covered calls and synthetic covered calls in under 60 seconds.
      </p>

      {/* ---- Media: Toon (default) / Video ---- */}
      <div className="mt-5">
        <CoveredCallMediaTabs
          toonPanel={
            <div className="pt-4">
              <a
                href={TOON_SRC}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative"
                aria-label="Open the full-size covered call comic in a new tab"
              >
                <Image
                  src={TOON_SRC}
                  alt="Comic explaining the difference between a traditional covered call ETF and a synthetic covered call ETF, including limited upside, downside risk, and the difference between distribution rate and total return."
                  width={1536}
                  height={1024}
                  priority
                  sizes="(max-width: 768px) 100vw, 1100px"
                  className="w-full h-auto rounded-lg border border-[var(--gray-200)]"
                />
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--gray-500)] group-hover:text-black transition-colors">
                  Tap to view full size ⤢
                </span>
              </a>
            </div>
          }
          videoPanel={
            <div className="pt-4">
              {videoExists ? (
                <video
                  controls
                  playsInline
                  className="w-full aspect-video rounded-lg border border-[var(--gray-200)] bg-black"
                  src={VIDEO_SRC}
                />
              ) : (
                <div className="w-full aspect-video rounded-lg border border-[var(--gray-200)] bg-[var(--gray-900)] text-white flex flex-col items-center justify-center text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <Play size={24} strokeWidth={2} fill="currentColor" aria-hidden="true" />
                  </div>
                  <div className="mt-4 text-[11px] font-semibold tracking-widest text-white/60 uppercase">Coming Soon</div>
                  <div className="mt-2 text-lg font-bold">60-Second Explainer</div>
                  <p className="mt-1.5 text-sm text-white/70 max-w-sm">
                    Covered call vs. synthetic covered call in under 60 seconds. Video coming soon.
                  </p>
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* ---- Crawlable quick summary (not gated behind the tabs above) ---- */}
      <section className="mt-6">
        <h2 className="text-lg sm:text-xl font-bold mb-3">What Is a Covered Call ETF?</h2>
        <div id="quick-summary" className="max-w-3xl text-[15px] leading-relaxed text-[var(--gray-700)] space-y-3">
          <p>
            A covered call ETF is an exchange-traded fund that holds stocks or other securities and sells
            (&quot;writes&quot;) call options against that exposure. The option premium collected from selling those
            calls becomes a source of income the fund can distribute — a different mechanism from a typical
            dividend ETF, whose payouts usually come from dividends its underlying companies already pay out,
            not from selling options.
          </p>
          <p>
            A synthetic covered call strategy can use options to create stock-like exposure instead of directly
            owning the underlying asset. It may then sell calls or call spreads to generate income.
          </p>
          <p>Both structures can produce significant distributions, but substantial downside risk can remain.</p>
        </div>
      </section>

      <div className="mt-5 text-center py-3.5 px-4 border-y border-[var(--gray-200)] bg-[var(--gray-50)] font-black tracking-tight text-base sm:text-lg">
        HIGH DISTRIBUTION ≠ HIGH TOTAL RETURN
      </div>

      {/* ---- Key trade-off ---- */}
      <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 sm:px-6 sm:py-6">
        <div className="max-w-3xl">
          <div className="text-xs font-bold tracking-widest uppercase text-[#92400e]">The Key Trade-Off</div>
          <p className="mt-2 text-lg sm:text-xl font-black tracking-tight text-[var(--gray-900)]">
            Upside may be limited while downside risk can still be substantial.
          </p>
          <p className="mt-2 text-sm text-[var(--gray-700)]">
            Know the strategy. Understand the risk. Look at total return.
          </p>
        </div>
      </section>

      {/* ---- Comparison ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Covered Call ETF vs. Synthetic Covered Call ETF</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="border border-[var(--gray-200)] rounded-lg p-4">
            <h3 className="text-sm font-bold text-[var(--gray-900)]">Traditional Covered Call</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--gray-700)] list-disc pl-4">
              <li>Fund owns the underlying shares</li>
              <li>Sells call options against those holdings</li>
              <li>Receives option premium as income</li>
            </ul>
          </div>
          <div className="border border-[var(--gray-200)] rounded-lg p-4">
            <h3 className="text-sm font-bold text-[var(--gray-900)]">Synthetic Covered Call</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--gray-700)] list-disc pl-4">
              <li>Uses options to create stock-like exposure</li>
              <li>Doesn&apos;t necessarily own the underlying shares directly</li>
              <li>Sells calls or call spreads to generate option premium</li>
            </ul>
          </div>
        </div>

        {/* Desktop/tablet: table. Hidden below sm so nothing needs horizontal scrolling on phones. */}
        <div className="hidden sm:block border border-[var(--gray-200)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium w-[26%]">&nbsp;</th>
                <th className="text-left px-4 py-2.5 font-medium">Covered Call ETF</th>
                <th className="text-left px-4 py-2.5 font-medium">Synthetic Covered Call ETF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.aspect} className={i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}>
                  <td className="px-4 py-3 font-semibold align-top">{row.aspect}</td>
                  <td className="px-4 py-3 text-[var(--gray-700)] align-top">{row.traditional}</td>
                  <td className="px-4 py-3 text-[var(--gray-700)] align-top">{row.synthetic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards, same data. */}
        <div className="sm:hidden space-y-3">
          {COMPARISON_ROWS.map((row) => (
            <div key={row.aspect} className="border border-[var(--gray-200)] rounded-lg p-3.5">
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--gray-500)]">{row.aspect}</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--gray-500)]">Covered Call</div>
                  <div className="mt-0.5 text-[var(--gray-800)]">{row.traditional}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[var(--gray-500)]">Synthetic</div>
                  <div className="mt-0.5 text-[var(--gray-800)]">{row.synthetic}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 max-w-3xl text-sm text-[var(--gray-600)] leading-relaxed">
          <span className="font-semibold text-[var(--gray-800)]">A note on YieldMax:</span> YieldMax funds are a
          common example of the synthetic structure above, but YieldMax uses more than one option-income design
          — not every YieldMax ETF works identically. See{" "}
          <Link href="/magazine/yieldmax-guide" className="underline hover:text-black">
            how YieldMax ETFs work
          </Link>{" "}
          before assuming two of its funds behave the same way.
        </p>
      </section>

      {/* ---- Why investors use these funds ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">Why Do Investors Use Covered Call ETFs?</h2>
        <div className="max-w-3xl text-[15px] leading-relaxed text-[var(--gray-700)] space-y-3">
          <p>
            The main appeal is income. Selling call options generates option premium upfront, which can fund
            frequent — often weekly or monthly — cash distributions that are typically larger than what a
            traditional dividend-paying stock or fund offers.
          </p>
          <p>
            That premium income can be especially useful in a flat or moderately rising market: even if the
            underlying asset doesn&apos;t move much, the fund can still generate meaningful income simply from
            selling options period after period.
          </p>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-[var(--gray-600)]">
          Curious how that actually plays out for a real fund?{" "}
          <Link href="/etf-calculator" className="underline hover:text-black font-medium">
            Try the ETF Return Calculator →
          </Link>{" "}
          to see how a covered-call ETF has actually performed, including price change and distributions.
        </p>
      </section>

      {/* ---- Risks ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">What Are the Risks?</h2>
        <div className="max-w-3xl text-[15px] leading-relaxed text-[var(--gray-700)]">
          <ul className="space-y-2.5 list-disc pl-5">
            <li>
              <span className="font-semibold text-[var(--gray-900)]">Upside can be limited.</span>{" "}
              Selling calls typically means giving up some gains beyond the option&apos;s strike price.
            </li>
            <li>
              <span className="font-semibold text-[var(--gray-900)]">The underlying asset can still decline significantly.</span>{" "}
              Option premium does not eliminate downside risk — a covered call ETF&apos;s share price can fall
              substantially even while it keeps paying distributions.
            </li>
            <li>
              <span className="font-semibold text-[var(--gray-900)]">A high distribution yield does not automatically mean a high total return.</span>{" "}
              Distributions are only one side of the ledger; share-price or NAV movement is the other (see below).
            </li>
            <li>
              <span className="font-semibold text-[var(--gray-900)]">Distributions can change significantly</span>{" "}
              from period to period, since they largely track option premium, which moves with volatility.
            </li>
            <li>
              <span className="font-semibold text-[var(--gray-900)]">Some distributions may include return of capital (ROC),</span>{" "}
              depending on the fund — money that isn&apos;t investment income but instead reduces your cost basis.
            </li>
          </ul>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-[var(--gray-600)]">
          Want to weigh several funds side by side?{" "}
          <Link href="/compare" className="underline hover:text-black font-medium">
            Compare Covered-Call ETFs →
          </Link>
        </p>
      </section>

      {/* ---- YieldMax ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">How Does This Relate to YieldMax?</h2>
        <div className="max-w-3xl text-[15px] leading-relaxed text-[var(--gray-700)] space-y-3">
          <p>
            YieldMax is known for option-income ETFs with high, eye-catching distributions. It&apos;s easy to
            assume these funds simply own stocks and pay out large dividends — in reality, most YieldMax ETFs
            use a synthetic covered call strategy: they build stock-like exposure entirely out of options,
            rather than owning the underlying shares.
          </p>
          <p>
            The exact structure varies by fund — option tenor, strike selection, and even whether a fund uses
            plain short calls or a call spread differ from ticker to ticker. Some YieldMax funds also target
            underlyings you can&apos;t buy directly on the stock market at all. Understand the specific fund you&apos;re
            looking at rather than assuming every YieldMax ETF behaves the same way. See the{" "}
            <Link href="/magazine/yieldmax-guide" className="underline hover:text-black">
              YieldMax ETF Guide
            </Link>{" "}
            for the general mechanics, or browse{" "}
            <Link href="/tsly" className="underline hover:text-black">
              TSLY
            </Link>
            ,{" "}
            <Link href="/msty" className="underline hover:text-black">
              MSTY
            </Link>
            , and{" "}
            <Link href="/nvdy" className="underline hover:text-black">
              NVDY
            </Link>{" "}
            — three widely-followed YieldMax funds tracked on CRADY — for a specific fund&apos;s own data.
          </p>
        </div>
      </section>

      {/* ---- Why distributions are high ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">Why Are Covered Call ETF Distributions So High?</h2>
        <div className="max-w-3xl text-[15px] leading-relaxed text-[var(--gray-700)] space-y-3">
          <p>
            Selling options can generate substantial option premium. That cash flow can support frequent or
            large distributions — but a distribution is not automatically investment profit.
          </p>
        </div>

        <div className="mt-4 text-center py-3.5 px-4 border-y border-[var(--gray-200)] bg-[var(--gray-50)] font-black tracking-tight text-base sm:text-lg">
          DISTRIBUTION RATE ≠ TOTAL RETURN
        </div>

        <div className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--gray-700)] space-y-3">
          <p>
            An investor can receive large cash distributions while the ETF&apos;s share price or NAV declines.
            That&apos;s why it&apos;s worth adding up both sides of the ledger:
          </p>
          <p className="not-prose rounded-lg border border-[var(--gray-200)] bg-white px-4 py-3 text-sm font-semibold text-[var(--gray-800)]">
            Cash distributions + Share-price / NAV movement = Overall investment result (total return)
          </p>
          <p className="text-xs text-[var(--gray-500)]">
            (Illustrative only — not a real fund. For example: a fund distributing 10% of its price over a year
            while its share price also fell 15% would have a negative total return that year, despite the
            double-digit distribution rate.)
          </p>
          <p>
            Part of a distribution can also be classified as return of capital (ROC) — money that isn&apos;t taxed
            as income but instead reduces your cost basis. Not every distribution is ROC, and the mix varies by
            fund and by year; check each fund&apos;s own reporting rather than assuming one way or the other.
          </p>
        </div>
      </section>

      {/* ---- Before investing ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Before Investing, Ask These 4 Questions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BEFORE_INVESTING_QUESTIONS.map((q, i) => (
            <div key={q} className="border border-[var(--gray-200)] rounded-lg px-4 py-3.5 flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--gray-900)] text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-[var(--gray-800)] pt-0.5">{q}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mt-10">
        <h2 className="text-lg sm:text-xl font-bold mb-3">Frequently Asked Questions</h2>
        <div className="not-prose max-w-3xl divide-y divide-[var(--gray-100)]">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question} className="py-4 first:pt-0">
              <div className="font-semibold text-sm">{item.question}</div>
              <p className="mt-1.5 text-sm text-[var(--gray-600)] leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Internal discovery / CTA ---- */}
      <section className="mt-10 border border-[var(--gray-200)] rounded-xl bg-[var(--gray-50)] p-5 sm:p-6">
        <div className="font-bold text-base">Want to See Real Examples?</div>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          Browse actual covered call and synthetic covered call ETFs, with live CRADY scores and dividend
          predictions.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/magazine/yieldmax-etfs"
            className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-[var(--gray-800)] transition-colors"
          >
            Explore YieldMax ETFs →
          </Link>
          <Link
            href="/magazine/yieldmax-guide"
            className="px-4 py-2 rounded-full border border-[var(--gray-300)] text-sm font-semibold hover:border-black transition-colors"
          >
            See How YieldMax ETFs Work →
          </Link>
        </div>
        <p className="mt-4 text-xs text-[var(--gray-500)]">
          Want the deeper dive — NAV erosion, return of capital, and tax treatment? See the full{" "}
          <Link href="/magazine/covered-call-etf-guide" className="underline hover:text-black">
            Covered Call ETF Guide
          </Link>
          .
        </p>
      </section>

      <p className="mt-8 pt-6 border-t border-[var(--gray-200)] text-xs text-[var(--gray-500)] leading-relaxed">
        This page is for educational purposes only and is not investment advice.
      </p>
    </PageShell>
  );
}
