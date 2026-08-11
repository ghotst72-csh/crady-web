import Link from "next/link";
import { TrendingUp, FileText, Wallet, ArrowRight, Play } from "lucide-react";
import { getHomeSnapshot } from "@/lib/data";
import { STANDALONE_PAGES, STANDALONE_PAGE_IDS } from "@/lib/magazine/standalone";
import { HUB_DEFINITIONS, HUB_IDS } from "@/lib/magazine/hubs";
import { buildArticleJsonLd, buildFaqJsonLd, buildWebPageJsonLd } from "@/lib/magazine/jsonld";
import { getCoveredCallExample } from "@/lib/magazine/coveredCallExample";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { RelatedContent } from "@/components/RelatedContent";
import { PageAppCta } from "@/components/PageAppCta";
import { PageTrustFooter } from "@/components/seo/PageTrustFooter";
import { PageShell } from "@/components/layout/PageShell";

const SLUG = "covered-call-etf-guide" as const;
const URL = `https://crady.net/magazine/${SLUG}`;
// Evergreen content has no real per-page publish date — same fixed date the
// shared StandalonePage template already uses for this page, kept
// identical so datePublished doesn't silently change across the redesign.
const PILLAR_PAGE_DATE = "2026-08-03T00:00:00.000Z";

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Visual redesign of /magazine/covered-call-etf-guide — reference spec:
 * the 2026-08-11 UI mockup. Every SEO-load-bearing element (URL, canonical,
 * metadata, H1, H2s, FAQ copy + schema, internal links) is carried over
 * verbatim from lib/magazine/standalone.tsx's "covered-call-etf-guide"
 * entry — only the visual layout changes. Special-cased for this one slug
 * in app/(en)/magazine/[slug]/page.tsx; every other Magazine page (article,
 * hub, calendar-hub, and the other 9 standalone guides) keeps rendering
 * through the shared StandalonePage template, untouched. */
export async function CoveredCallGuideRedesign() {
  const def = STANDALONE_PAGES[SLUG];
  const [example, relatedEtfs] = await Promise.all([
    getCoveredCallExample(),
    def.relatedEtfsQuery
      ? getHomeSnapshot().then((s) => s.filter(def.relatedEtfsQuery!.filter).sort(def.relatedEtfsQuery!.sort).slice(0, def.relatedEtfsQuery!.limit ?? 6))
      : Promise.resolve([]),
  ]);

  const articleJsonLd = buildArticleJsonLd({
    headline: def.h1,
    description: def.description,
    url: URL,
    datePublished: PILLAR_PAGE_DATE,
    dateModified: PILLAR_PAGE_DATE,
  });
  const webPageJsonLd = buildWebPageJsonLd({ name: def.h1, description: def.description, url: URL });
  const faqJsonLd = buildFaqJsonLd(def.faqItems);

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "Magazine", url: "https://crady.net/magazine" },
          { name: def.h1, url: URL },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <nav className="text-xs text-[var(--gray-600)] mb-4">
        <Link href="/" className="hover:text-black">Home</Link> <span aria-hidden="true">/</span>{" "}
        <Link href="/magazine" className="hover:text-black">Magazine</Link> <span aria-hidden="true">/</span>{" "}
        <span className="text-[var(--gray-900)]">{def.h1}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{def.h1}</h1>

      {/* Visual-explainer callout */}
      <Link
        href="/what-is-a-covered-call-etf"
        className="group mt-5 flex items-center gap-4 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-5 py-4 hover:border-black transition-colors"
      >
        <span className="shrink-0 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
          <Play size={16} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--gray-900)]">
            Prefer a 60-second visual explanation first?
          </span>
          <span className="block text-sm text-[var(--gray-600)] mt-0.5">
            See{" "}
            <span className="underline group-hover:text-black">What Is a Covered Call ETF? (the visual explainer)</span>{" "}
            <span aria-hidden="true">→</span>
          </span>
        </span>
      </Link>

      <div className="mt-10 space-y-12 text-[15px] leading-relaxed text-[var(--gray-700)]">
        {/* ---- Section 1 ---- */}
        <section>
          <SectionHeading n={1}>What Is a Covered Call ETF?</SectionHeading>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="order-1 lg:order-1">
              <p>
                A covered call ETF holds an underlying asset (a single stock, an index, or a basket of
                stocks) and systematically sells (&quot;writes&quot;) call options against it.
              </p>
              <p className="mt-3">
                The premium collected from selling those options is the main source of the fund&apos;s
                often very high distributions — it&apos;s option income, not a dividend paid by the
                underlying company.
              </p>
            </div>
            <div className="order-2 lg:order-2">
              <HowItWorksDiagram />
            </div>
          </div>
        </section>

        {/* ---- Section 2 ---- */}
        <section>
          <SectionHeading n={2}>How the Income Is Generated</SectionHeading>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="order-2 lg:order-1">
              <SellCallExampleDiagram />
            </div>
            <div className="order-1 lg:order-2">
              <p>
                Selling a call option obligates the fund to sell its shares at a set price (the strike) if
                the option is exercised.
              </p>
              <p className="mt-3">
                In exchange, the fund collects a premium upfront, regardless of what the underlying does
                afterward.
              </p>
              <p className="mt-3">
                Some funds sell options on the underlying stock directly; others (like many{" "}
                <Link href="/magazine/yieldmax-guide" className="underline hover:text-black">
                  YieldMax funds
                </Link>
                ) use a synthetic covered call built from options alone, without owning the underlying
                shares outright.
              </p>
            </div>
          </div>
        </section>

        {/* ---- Section 3 ---- */}
        <section>
          <SectionHeading n={3}>The Trade-Off: Yield vs. Upside</SectionHeading>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="order-1 lg:order-1">
              <p>
                Selling calls caps how much of the underlying&apos;s upside the fund can capture — if the
                stock rallies past the strike price, the fund misses out on gains above that level.
              </p>
              <p className="mt-3">
                This is the fundamental trade-off: a covered call strategy exchanges some upside potential
                for current income, which is why these funds can post double-digit annualized distribution
                rates while their share price can still decline over time.
              </p>
              <p className="mt-3">
                See{" "}
                <Link href="/magazine/nav-erosion-guide" className="underline hover:text-black">
                  the NAV Erosion Guide
                </Link>{" "}
                for how that plays out in practice, and{" "}
                <Link href="/magazine/return-of-capital-guide" className="underline hover:text-black">
                  the Return of Capital Guide
                </Link>{" "}
                for how part of that income can actually be your own capital coming back to you.
              </p>
            </div>
            <div className="order-2 lg:order-2">
              <TradeOffDiagram />
            </div>
          </div>
        </section>
      </div>

      {/* ---- Real Example ---- */}
      <section className="mt-12">
        <RealExampleCard example={example} />
      </section>

      {/* ---- Why Investors Choose ---- */}
      <section className="mt-12">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Why Investors Choose Covered Call ETFs</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BenefitCard
            title="High Income Potential"
            body="Option premiums can generate attractive, above-market distribution yields."
          />
          <BenefitCard
            title="Frequent Distributions"
            body="Many covered call ETFs pay weekly or monthly, not just quarterly."
          />
          <BenefitCard
            title="Defined Trade-Off"
            body="You know upfront: some upside is exchanged for current income."
          />
          <BenefitCard
            title="Real-Time Tracking"
            body="CRADY calculates real yield, CRADY Score, and next-dividend predictions daily."
          />
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section className="mt-12">
        <h2 className="text-lg sm:text-xl font-bold mb-3">Frequently Asked Questions</h2>
        <div className="not-prose divide-y divide-[var(--gray-100)] border-t border-[var(--gray-100)]">
          {def.faqItems.map((item) => (
            <details key={item.question} className="group py-1">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 py-3 font-semibold text-sm text-[var(--gray-900)]">
                {item.question}
                <span className="shrink-0 text-[var(--gray-400)] transition-transform group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <p className="pb-3 text-sm text-[var(--gray-600)] leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {relatedEtfs.length > 0 && def.relatedEtfsQuery && (
        <section className="mt-12">
          <h2 className="text-lg sm:text-xl font-bold mb-3">{def.relatedEtfsQuery.heading}</h2>
          <div className="not-prose flex flex-wrap gap-2">
            {relatedEtfs.map((etf) => (
              <Link
                key={etf.ticker}
                href={`/magazine/${etf.ticker.toLowerCase()}-next-dividend-prediction`}
                className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
              >
                {etf.ticker}
                {etf.annualYieldPct != null && (
                  <span className="ml-1.5 text-[var(--gray-500)]">{etf.annualYieldPct.toFixed(1)}%</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-sm text-[var(--gray-500)] border-t border-[var(--gray-200)] pt-4">
        This page is educational and general in nature — it is not investment advice.
      </p>

      <RelatedContent
        lang="en"
        etfs={relatedEtfs.slice(0, 5).map((etf) => ({
          href: `/magazine/${etf.ticker.toLowerCase()}-next-dividend-prediction`,
          label: `${etf.ticker} Next Dividend Prediction`,
        }))}
        guides={STANDALONE_PAGE_IDS.filter((id) => id !== SLUG)
          .slice(0, 5)
          .map((id) => ({ href: `/magazine/${id}`, label: STANDALONE_PAGES[id].h1 }))}
        rankings={[
          { href: `/magazine/${HUB_IDS[0]}`, label: HUB_DEFINITIONS[HUB_IDS[0]].h1 },
          { href: "/distributions", label: "Latest Official Distributions" },
        ]}
      />
      <PageAppCta lang="en" />
      <PageTrustFooter lang="en" />
    </PageShell>
  );
}

function SectionHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg sm:text-xl font-bold">
      <span className="shrink-0 w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      {children}
    </h2>
  );
}

function BenefitCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-[var(--gray-200)] rounded-lg px-3.5 py-3.5 sm:px-4 sm:py-4">
      <div className="text-sm font-bold text-[var(--gray-900)]">{title}</div>
      <p className="mt-1 text-xs text-[var(--gray-600)] leading-relaxed">{body}</p>
    </div>
  );
}

/** Section 1's right-column diagram: Hold → Sell → Collect, three steps. */
function HowItWorksDiagram() {
  const steps = [
    { icon: TrendingUp, title: "Hold Underlying", caption: "(equity/ETFs)" },
    { icon: FileText, title: "Sell Call Options", caption: "(earn premium)" },
    { icon: Wallet, title: "Collect Premium", caption: "(option income)" },
  ];
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4 sm:p-5">
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide text-center mb-4">
        How it works (in simple terms)
      </div>
      <div className="flex items-center justify-between gap-1.5">
        {steps.map((s, i) => (
          <div key={s.title} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex-1 min-w-0 flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-full bg-[var(--gray-50)] border border-[var(--gray-200)] flex items-center justify-center">
                <s.icon size={18} strokeWidth={2} className="text-[#92400e]" aria-hidden="true" />
              </div>
              <div className="mt-2 text-xs font-semibold text-[var(--gray-900)] leading-tight">{s.title}</div>
              <div className="text-[11px] text-[var(--gray-500)] leading-tight">{s.caption}</div>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={16} strokeWidth={2} className="shrink-0 text-[var(--gray-300)]" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Section 2's left-column (desktop) diagram: a generic, hypothetical
 * options-mechanics example — not tied to any specific fund's real data. */
function SellCallExampleDiagram() {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4 sm:p-5">
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide text-center mb-4">
        Example: Selling a Call Option
      </div>
      <div className="flex items-stretch justify-between gap-1.5 text-center">
        <div className="flex-1 min-w-0 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] px-2 py-3">
          <div className="text-[11px] text-[var(--gray-500)]">You hold</div>
          <div className="text-xs font-semibold text-[var(--gray-900)] mt-0.5">S&amp;P 500</div>
          <div className="text-sm font-bold text-[var(--gray-900)]">$100</div>
        </div>
        <ArrowRight size={16} strokeWidth={2} className="shrink-0 self-center text-[var(--gray-300)]" aria-hidden="true" />
        <div className="flex-1 min-w-0 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] px-2 py-3">
          <div className="text-[11px] text-[var(--gray-500)]">Sell a call option</div>
          <div className="text-xs font-semibold text-[var(--gray-900)] mt-0.5">strike: $110</div>
        </div>
        <ArrowRight size={16} strokeWidth={2} className="shrink-0 self-center text-[var(--gray-300)]" aria-hidden="true" />
        <div className="flex-1 min-w-0 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)] px-2 py-3">
          <div className="text-[11px] text-[var(--gray-500)]">Collect</div>
          <div className="text-xs font-semibold text-[#92400e] mt-0.5">premium today</div>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--gray-500)] leading-relaxed">
        If the price stays below the strike → the fund keeps the premium. If the price goes above the
        strike → shares may be &quot;called away&quot; at $110. Hypothetical example, not a real fund.
      </p>
    </div>
  );
}

/** Section 3's right-column diagram: a simple, non-data schematic — two
 * lines (underlying vs. covered-call ETF), not a real price chart. Palette
 * validated with the dataviz skill's validator (light-mode categorical,
 * ALL CHECKS PASS): #2a78d6 / #4a3aa7, both ≥3:1 contrast, worst-pair CVD
 * ΔE 13.0 / normal-vision ΔE 16.3 — clear of every floor. */
function TradeOffDiagram() {
  const underlyingColor = "#2a78d6";
  const coveredCallColor = "#4a3aa7";
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4 sm:p-5">
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide text-center mb-3">
        The Trade-Off in One Look
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--gray-600)] mb-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: underlyingColor }} />
          Underlying (e.g. S&amp;P 500)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: coveredCallColor }} />
          Covered Call ETF
        </span>
      </div>
      <svg viewBox="0 0 480 210" className="w-full h-auto" role="img" aria-label="Schematic: the underlying rises steadily while the covered call ETF's gains flatten out after a certain point, illustrating capped upside.">
        <line x1="40" y1="185" x2="450" y2="185" stroke="var(--gray-200)" strokeWidth="1" />
        <path d="M40,180 L160,140 L280,80 L440,20" fill="none" stroke={underlyingColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40,172 L160,128 L280,92 L360,86 L440,83" fill="none" stroke={coveredCallColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="92" cy="160" r="2" fill="#92400e" />
        <text x="102" y="163" fontSize="10" fill="#92400e" fontWeight="600">+ premium income</text>
        <line x1="452" y1="20" x2="452" y2="83" stroke="var(--gray-400)" strokeWidth="1" />
        <line x1="448" y1="20" x2="456" y2="20" stroke="var(--gray-400)" strokeWidth="1" />
        <line x1="448" y1="83" x2="456" y2="83" stroke="var(--gray-400)" strokeWidth="1" />
        <text x="460" y="55" fontSize="10" fill="var(--gray-600)" fontWeight="600">Upside</text>
        <text x="460" y="67" fontSize="10" fill="var(--gray-600)" fontWeight="600">capped</text>
        <text x="40" y="200" fontSize="10" fill="var(--gray-500)">Lower</text>
        <text x="150" y="200" fontSize="10" fill="var(--gray-500)">Flat</text>
        <text x="255" y="200" fontSize="10" fill="var(--gray-500)">Moderate Up</text>
        <text x="395" y="200" fontSize="10" fill="var(--gray-500)">Strong Up</text>
      </svg>
    </div>
  );
}

function RealExampleCard({ example }: { example: Awaited<ReturnType<typeof getCoveredCallExample>> }) {
  if (!example.ok) {
    return (
      <div className="rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-5 py-5 sm:px-6 sm:py-6">
        <div className="text-sm font-bold text-[var(--gray-900)]">Real Example: TSLY</div>
        <p className="mt-2 text-sm text-[var(--gray-600)]">
          {example.reason === "split-anomaly"
            ? "A price-history anomaly consistent with an unrecorded stock split was detected for TSLY over the lookback window, so CRADY is not showing a return figure here rather than risk a distorted number."
            : "Not enough price/distribution history is currently available to compute a real trailing-12-month return for TSLY."}
        </p>
      </div>
    );
  }

  const isPositive = example.totalReturnPct >= 0;

  return (
    <div className="rounded-xl border border-[var(--gray-200)] px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-bold text-[var(--gray-900)]">
          Real Example: {example.ticker}{" "}
          <span className="font-normal text-[var(--gray-500)]">
            ({fmtDate(example.startDate)} – {fmtDate(example.endDate)})
          </span>
        </div>
        <div className="text-xs text-[var(--gray-400)]">Past performance is not indicative of future results.</div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 sm:gap-3 items-center">
        <StatBlock label="Price Return" sublabel="Share price change" value={fmtPct(example.priceReturnPct)} tone={example.priceReturnPct >= 0 ? "good" : "bad"} />
        <Operator symbol="+" />
        <StatBlock label="Distributions" sublabel={`${example.distributionCount} payments received`} value={fmtPct(example.distributionsPct)} tone="good" />
        <Operator symbol="=" />
        <StatBlock label="Total Return" sublabel="Actual total return" value={fmtPct(example.totalReturnPct)} tone={isPositive ? "good" : "bad"} emphasize />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--gray-100)]">
        <p className="text-xs text-[var(--gray-500)] max-w-md">
          Trailing 12 months, computed from {example.ticker}&apos;s real recorded price and distribution
          history — not a hypothetical or hardcoded figure. Recalculated automatically as new data arrives.
        </p>
        <Link
          href={`/portfolio?ticker=${example.ticker}`}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-[var(--gray-800)] transition-colors"
        >
          Try the Return Calculator <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function Operator({ symbol }: { symbol: string }) {
  return (
    <div className="hidden sm:flex items-center justify-center text-xl font-bold text-[var(--gray-300)]">
      {symbol}
    </div>
  );
}

function StatBlock({
  label,
  sublabel,
  value,
  tone,
  emphasize = false,
}: {
  label: string;
  sublabel: string;
  value: string;
  tone: "good" | "bad";
  emphasize?: boolean;
}) {
  const color = tone === "good" ? "#0ca30c" : "#d03b3b";
  return (
    <div className={`text-center ${emphasize ? "sm:border-l sm:border-[var(--gray-200)] sm:pl-3" : ""}`}>
      <div className="text-xs font-semibold text-[var(--gray-500)]">{label}</div>
      <div className={`mt-1 font-black tracking-tight ${emphasize ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`} style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--gray-500)] mt-0.5">{sublabel}</div>
    </div>
  );
}
