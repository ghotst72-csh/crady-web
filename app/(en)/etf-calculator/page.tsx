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
const TITLE = "ETF Calculator | Free ETF Return & Dividend Reinvestment Calculator";
const DESCRIPTION =
  "Estimate ETF investment growth with CRADY's free ETF calculator. Model monthly contributions, expense ratios, and dividend reinvestment, or pull in real return and yield data for any ETF CRADY tracks.";

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
    question: "How do you calculate ETF returns?",
    answer:
      "This calculator projects growth month by month: each month it adds your monthly contribution, then applies that month's share of your expected annual return (net of fees), split between price appreciation and cash distributions based on the distribution yield you set. The result compounds over your chosen investment period. It's a projection from the assumptions you enter, not a prediction — real markets don't move in a straight line.",
  },
  {
    question: "How do ETF fees affect long-term returns?",
    answer:
      "A fund's expense ratio is deducted from its return every year, and because it compounds, even a small fee has an outsized effect over long periods. This calculator subtracts your Annual Fee input from the Expected Annual Return before compounding, so you can see the difference a 0.15% fund versus a 1% fund makes over 10, 20, or 30 years by changing that one field.",
  },
  {
    question: "What happens if ETF dividends are reinvested?",
    answer:
      "With Reinvest Distributions ON, every distribution immediately buys more (fractional) shares, so future distributions and price growth compound on a larger balance. With it OFF, distributions are paid out as cash and tracked separately from your portfolio value — useful for modeling an ETF you plan to hold for income rather than growth. Reinvesting compounds faster; taking cash gives you spendable income sooner.",
  },
  {
    question: "How much can $10,000 invested in an ETF grow?",
    answer:
      "It depends entirely on your return assumption, time horizon, and whether you add more over time. $10,000 growing at an assumed 8% annual return for 20 years with no further contributions projects to roughly $46,600 before fees; add a $500 monthly contribution and that same 20-year, 8% scenario projects to well over $300,000. Enter your own numbers above — the result updates instantly.",
  },
  {
    question: "Does this calculator include taxes?",
    answer:
      "No. Taxes are excluded entirely — this tool shows pre-tax projected growth only. Actual after-tax results depend on your account type (taxable vs. IRA/401(k)), your tax bracket, and how a specific fund's distributions are characterized (ordinary income, qualified dividends, or return of capital). See CRADY's Covered Call ETF Dividend Tax Guide for how that works for option-income funds specifically.",
  },
];

const ASSUMPTIONS: { title: string; body: string }[] = [
  { title: "Compounding", body: "Growth is compounded monthly, not annually — your expected annual return is applied as 1/12th each month to that month's balance." },
  { title: "Monthly contributions", body: "Each monthly contribution is added at the start of the month, then that month's growth is applied to the new, larger balance." },
  { title: "Annual return assumption", body: "The Expected Annual Return you enter is a single, constant average for the entire period. Real markets are volatile year to year even when they average out to a similar long-run figure." },
  { title: "Expense ratio treatment", body: "Your Annual Fee is subtracted from the Expected Annual Return before compounding, every year of the projection — it is not a one-time deduction." },
  { title: "Distribution reinvestment", body: "The Assumed Distribution Yield portion of your return either compounds back into the balance (Reinvest ON) or accumulates separately as cash (Reinvest OFF) — see the toggle above the results." },
  { title: "Taxes are excluded", body: "This calculator shows pre-tax growth only. It does not model your tax bracket, account type, or how a fund's distributions are characterized." },
  { title: "Market returns are not guaranteed", body: "Every figure on this page is a projection from the assumptions you entered, not a forecast or a promise. Past ETF performance, including any real data pulled in from CRADY's tracked funds, does not guarantee future results." },
];

export default async function EtfCalculatorPage() {
  const snapshot = await getHomeSnapshot();
  const searchIndex = toSearchIndex(snapshot);

  const webPageJsonLd = buildWebPageJsonLd({ name: "ETF Investment Return Calculator", description: DESCRIPTION, url: PAGE_URL });
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

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight">ETF Investment Return Calculator</h1>
      <p className="mt-2 text-[15px] sm:text-base text-[var(--gray-600)] max-w-2xl">
        Estimate your potential returns from ETF investments — model monthly contributions, fees, and dividend
        reinvestment, or pull in real return and yield data for any ETF CRADY tracks.
      </p>

      <div className="mt-6">
        <EtfCalculator searchIndex={searchIndex} />
      </div>

      {/* ---- How this calculation works ---- */}
      <section id="how-this-works" className="mt-10 scroll-mt-20">
        <details className="group border border-[var(--gray-200)] rounded-xl p-4 sm:p-5">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-bold text-sm text-[var(--gray-900)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]">
            How This Calculation Works
            <span className="shrink-0 text-[var(--gray-400)] transition-transform group-open:rotate-45 text-lg leading-none">+</span>
          </summary>
          <div className="mt-4 space-y-3">
            {ASSUMPTIONS.map((a) => (
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
        <h2 className="text-lg sm:text-xl font-bold mb-3">ETF Return Calculator: Common Questions</h2>
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
        <div className="font-bold text-base">Want Real ETF Data Instead of a Projection?</div>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          See real, actually-paid distribution history, CRADY Scores, and next-dividend predictions for every
          tracked ETF.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/ranking" className="px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-[var(--gray-800)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] focus-visible:ring-offset-2">
            Explore ETF Rankings →
          </Link>
          <Link href="/portfolio" className="px-4 py-2 rounded-full border border-[var(--gray-300)] text-sm font-semibold hover:border-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] focus-visible:ring-offset-2">
            Real Historical Return Calculator →
          </Link>
        </div>
      </section>

      <p className="mt-8 pt-6 border-t border-[var(--gray-200)] text-xs text-[var(--gray-500)] leading-relaxed">
        This calculator is for educational purposes only and is not investment advice. Projections are based on
        assumptions you enter and are not guarantees of future performance.
      </p>

      <PageAppCta lang="en" />
      <PageTrustFooter lang="en" />
    </PageShell>
  );
}
