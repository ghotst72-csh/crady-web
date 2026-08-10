import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "./types";
import type { EtfSnapshot } from "@/lib/data";

/** Genuinely provider/ticker-agnostic educational content (tax treatment,
 * how to buy, and — added in SEO Authority Phase 2 — the 10 topical pillar
 * guides below) is nearly identical across all 72 tickers CRADY covers —
 * generating 72 near-duplicate per-ticker pages for it would be exactly the
 * "keyword-swapped page" pattern the Magazine 2.0 spec explicitly rules
 * out. Built as ONE comprehensive page per topic instead, cross-linked from
 * every ticker's guide page (lib/magazine/topicalLinks.ts), which is the
 * standard, Google-guideline-compliant way to capture that search intent
 * without doorway pages. */
export type StandalonePageId =
  | "tax-guide"
  | "how-to-buy"
  | "covered-call-etf-guide"
  | "monthly-vs-weekly-dividend-etfs"
  | "yieldmax-guide"
  | "distribution-schedule-guide"
  | "ex-dividend-date-guide"
  | "payment-date-guide"
  | "distribution-rate-guide"
  | "sec-yield-guide"
  | "nav-erosion-guide"
  | "return-of-capital-guide";

/** A pure filter/sort pair over the same EtfSnapshot[] the rest of the
 * Magazine system already fetches (lib/magazine/hubs.ts's HubDefinition
 * uses the identical shape) — this is what makes a pillar guide's "relevant
 * ETFs" list real and current instead of a hardcoded ticker list. Rendered
 * by StandalonePage in app/(en)/magazine/[slug]/page.tsx, which fetches the
 * snapshot once and applies whichever guide's query is present. */
export type RelatedEtfsQuery = {
  heading: string;
  filter: (e: EtfSnapshot) => boolean;
  sort: (a: EtfSnapshot, b: EtfSnapshot) => number;
  limit?: number;
};

export type StandalonePageDefinition = {
  slug: StandalonePageId;
  title: string;
  h1: string;
  description: string;
  body: ReactNode;
  faqItems: FaqItem[];
  relatedEtfsQuery?: RelatedEtfsQuery;
};

const byYieldDesc = (a: EtfSnapshot, b: EtfSnapshot) => (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1);
const byCradyScoreDesc = (a: EtfSnapshot, b: EtfSnapshot) => (b.cradyScore ?? -1) - (a.cradyScore ?? -1);
const bySoonestPrediction = (a: EtfSnapshot, b: EtfSnapshot) => {
  if (!a.nextPredictedDate) return 1;
  if (!b.nextPredictedDate) return -1;
  return a.nextPredictedDate < b.nextPredictedDate ? -1 : 1;
};

export const STANDALONE_PAGES: Record<StandalonePageId, StandalonePageDefinition> = {
  "tax-guide": {
    slug: "tax-guide",
    title: "Covered Call ETF Dividend Tax Guide | YieldMax, Roundhill & Defiance",
    h1: "Covered Call ETF Dividend Tax Guide",
    description:
      "How distributions from options-income ETFs like YieldMax, Roundhill and Defiance funds are typically taxed, including return of capital, Section 1256 treatment, and what to look for on your 1099-DIV.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">
            How Are Covered Call ETF Distributions Taxed?
          </h2>
          <p>
            Covered-call and options-income ETFs (the YieldMax, Roundhill and Defiance funds CRADY
            tracks) generate income primarily by selling call options against an underlying stock
            or index, rather than from the underlying company&apos;s own dividend. That income can
            be characterized in several different ways on your annual 1099-DIV, and the mix often
            varies from payment to payment:
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-1.5">
            <li>
              <strong>Ordinary income</strong> — option premium income is generally not a
              &quot;qualified dividend&quot; and is typically taxed at your ordinary income rate.
            </li>
            <li>
              <strong>Section 1256 gains</strong> — funds that use index options (rather than
              single-stock options) may report gains under Section 1256, which get a blended
              60% long-term / 40% short-term capital gains rate regardless of how long you held
              the shares.
            </li>
            <li>
              <strong>Return of capital (ROC)</strong> — a portion of a distribution can be
              classified as a return of your own invested capital rather than income. ROC isn&apos;t
              taxed immediately, but it lowers your cost basis, which can mean a larger capital
              gain (or smaller loss) when you eventually sell.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">What Shows Up on Your 1099-DIV</h2>
          <p>
            Your brokerage will issue a 1099-DIV each year breaking distributions down by these
            categories. Because the mix of ordinary income, capital gains, and return of capital
            can change fund-to-fund and year-to-year, the amount you actually owe tax on is
            usually meaningfully less than the total cash distributed — but exactly how much less
            depends on the specific fund and tax year.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Tax-Advantaged Accounts</h2>
          <p>
            Because a large share of covered-call ETF income is ordinary income rather than
            qualified dividends, many investors choose to hold these funds inside a tax-advantaged
            account (like an IRA) to defer or avoid that tax drag, rather than in a taxable
            brokerage account. See{" "}
            <Link href="/magazine/how-to-buy" className="underline hover:text-black">
              How to Buy Dividend ETFs
            </Link>{" "}
            for account-type considerations.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not tax advice. Tax treatment
          varies by fund, by year, and by your individual situation; consult a qualified tax
          professional before making decisions based on it.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Are YieldMax, Roundhill and Defiance ETF dividends qualified dividends?",
        answer:
          "Usually not, or only partially. Most of their distributions come from option premium income, which is typically taxed as ordinary income rather than at the lower qualified-dividend rate — though the exact split varies by fund and by year, as reported on your 1099-DIV.",
      },
      {
        question: "What is return of capital, and why does it matter?",
        answer:
          "Return of capital (ROC) is the portion of a distribution classified as giving you back your own invested principal rather than income. It isn't taxed when received, but it reduces your cost basis, which can increase the taxable capital gain when you eventually sell your shares.",
      },
      {
        question: "Should I hold covered call ETFs in an IRA?",
        answer:
          "Many investors do, specifically to defer or avoid ordinary-income tax on the option premium portion of distributions. Whether that's right for you depends on your own tax situation and goals — this isn't personalized tax advice.",
      },
    ],
  },
  "how-to-buy": {
    slug: "how-to-buy",
    title: "How to Buy Dividend ETFs | Step-by-Step Guide",
    h1: "How to Buy Dividend ETFs",
    description:
      "A step-by-step guide to buying high-yield dividend ETFs — brokerage setup, order types, ex-dividend timing, and account-type considerations for YieldMax, Roundhill and Defiance funds.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">Steps to Buy a Dividend ETF</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Open a brokerage account.</strong> Any standard US brokerage that trades
              listed ETFs (a taxable account or an IRA) can buy these funds — no special
              application is required since they trade on major exchanges like ordinary ETFs.
            </li>
            <li>
              <strong>Search by ticker.</strong> Look up the fund&apos;s ticker symbol (for
              example, on its CRADY profile page) and pull up a live quote.
            </li>
            <li>
              <strong>Check the ex-dividend date first.</strong> You must own shares before the
              ex-dividend date to receive that period&apos;s distribution. Buying on or after the
              ex-date means you&apos;ll receive the following payment instead — see each fund&apos;s{" "}
              <Link href="/magazine" className="underline hover:text-black">
                CRADY dividend calendar
              </Link>{" "}
              for upcoming dates.
            </li>
            <li>
              <strong>Place your order.</strong> A limit order (setting the maximum price
              you&apos;ll pay) is generally safer than a market order for less liquid ETFs, since
              it protects you from an unexpectedly wide bid-ask spread.
            </li>
            <li>
              <strong>Decide on DRIP.</strong> Most brokerages let you enroll in a dividend
              reinvestment plan (DRIP) to automatically buy more shares with each distribution,
              instead of receiving cash.
            </li>
          </ol>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Which Account Type?</h2>
          <p>
            Because option-income ETF distributions are often taxed as ordinary income rather than
            qualified dividends, many investors prefer to hold them in a tax-advantaged account.
            See the{" "}
            <Link href="/magazine/tax-guide" className="underline hover:text-black">
              Covered Call ETF Dividend Tax Guide
            </Link>{" "}
            for details.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not personalized investment
          advice. Consider your own goals, risk tolerance, and tax situation.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "What's the difference between a market order and a limit order?",
        answer:
          "A market order buys immediately at the current price, while a limit order only fills at your specified price or better. Limit orders are generally recommended for less liquid ETFs to avoid an unfavorable fill from a wide bid-ask spread.",
      },
      {
        question: "Do I need a special brokerage to buy YieldMax, Roundhill or Defiance ETFs?",
        answer:
          "No — these funds trade on major US exchanges like any other listed ETF, so any standard brokerage account that supports ETF trading can buy them.",
      },
      {
        question: "Should I buy before or after the ex-dividend date?",
        answer:
          "You must hold shares before the ex-dividend date to receive that period's distribution. If you buy on or after the ex-date, you'll simply be entitled to the next distribution cycle instead — the total return outcome isn't automatically better either way.",
      },
    ],
  },
  "covered-call-etf-guide": {
    slug: "covered-call-etf-guide",
    title: "What Is a Covered Call ETF? | Complete Guide",
    h1: "What Is a Covered Call ETF?",
    description:
      "How covered call (options-income) ETFs like YieldMax, Roundhill and Defiance funds generate high distributions, and the yield-vs-upside trade-off behind that income.",
    body: (
      <>
        <p className="not-prose border border-[var(--gray-200)] rounded-xl bg-[var(--gray-50)] px-4 py-3 text-sm">
          Prefer a 60-second visual explanation first? See{" "}
          <Link href="/what-is-a-covered-call-etf" className="underline hover:text-black font-medium">
            What Is a Covered Call ETF? (the visual explainer)
          </Link>
          , then come back here for the full breakdown.
        </p>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is a Covered Call ETF?</h2>
          <p>
            A covered call ETF holds an underlying asset (a single stock, an index, or a basket of
            stocks) and systematically sells (&quot;writes&quot;) call options against that holding.
            The premium collected from selling those options is the main source of the fund&apos;s
            often very high distributions — it&apos;s option income, not a dividend paid by the
            underlying company.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">How the Income Is Generated</h2>
          <p>
            Selling a call option obligates the fund to sell its shares at a set price (the strike)
            if the option is exercised. In exchange, the fund collects a premium upfront, regardless
            of what the underlying does afterward. Some funds sell options on the underlying stock
            directly; others (like many YieldMax funds) use a synthetic covered call built from
            options alone, without owning the underlying shares outright.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">The Trade-Off: Yield vs. Upside</h2>
          <p>
            Selling calls caps how much of the underlying&apos;s upside the fund can capture — if the
            stock rallies past the strike price, the fund misses out on gains above that level. This
            is the fundamental trade-off: a covered call strategy exchanges some upside potential for
            current income, which is why these funds can post double-digit annualized distribution
            rates while their share price can still decline over time. See{" "}
            <Link href="/magazine/nav-erosion-guide" className="underline hover:text-black">
              the NAV Erosion Guide
            </Link>{" "}
            for how that plays out in practice, and{" "}
            <Link href="/magazine/return-of-capital-guide" className="underline hover:text-black">
              the Return of Capital Guide
            </Link>{" "}
            for how part of that income can actually be your own capital coming back to you.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Do covered call ETFs own the stocks they track?",
        answer:
          "It depends on the fund. Some hold the underlying shares directly and sell calls against them. Others (including many YieldMax funds) use a synthetic position built entirely from options, without owning the underlying stock.",
      },
      {
        question: "Why do covered call ETFs have such high yields?",
        answer:
          "Their distributions are largely funded by option premium income, which can be substantial, especially on volatile underlyings — higher volatility generally means richer option premiums.",
      },
      {
        question: "Can a covered call ETF lose value even while paying a high distribution?",
        answer:
          "Yes. The distribution rate is separate from the fund's share price. A high payout doesn't prevent the share price from declining if the underlying falls or if distributions include a return of capital.",
      },
    ],
    relatedEtfsQuery: {
      heading: "Covered Call ETFs by CRADY Score",
      filter: () => true,
      sort: byCradyScoreDesc,
      limit: 6,
    },
  },
  "monthly-vs-weekly-dividend-etfs": {
    slug: "monthly-vs-weekly-dividend-etfs",
    title: "Monthly vs Weekly Dividend ETFs | Which Should You Choose?",
    h1: "Monthly vs Weekly Dividend ETFs",
    description:
      "The practical differences between monthly and weekly-paying dividend ETFs — cash-flow timing, compounding frequency, and how to decide which payout schedule fits your goals.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">Weekly Payers</h2>
          <p>
            Weekly-distribution ETFs (several YieldMax funds pay weekly) pay out on a roughly
            7-day cadence. More frequent payments mean more frequent — but individually smaller —
            cash flow, and more frequent opportunities to reinvest (DRIP) if you want compounding
            to happen faster.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Monthly Payers</h2>
          <p>
            Monthly-distribution ETFs pay roughly 12 times a year. Each individual payment is
            larger than a weekly fund&apos;s, and the schedule is easier to plan around for investors
            who want dividend income to line up with monthly expenses.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Which Should You Choose?</h2>
          <p>
            Frequency alone doesn&apos;t change the total annual income from a given yield — a 50%
            annualized yield pays roughly the same total whether split into 12 monthly payments or
            52 weekly ones. The real differences are cash-flow timing (does income need to arrive
            more often?) and DRIP compounding frequency (more frequent reinvestment compounds
            slightly faster, all else equal). See each ETF&apos;s own{" "}
            <Link href="/magazine" className="underline hover:text-black">
              dividend guide
            </Link>{" "}
            for its specific schedule.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Do weekly dividend ETFs pay more in total than monthly ones?",
        answer:
          "Not inherently — total annual income depends on the fund's yield, not its payment frequency. A weekly payer and a monthly payer with the same annualized yield pay roughly the same total per year, just in different-sized, differently-timed installments.",
      },
      {
        question: "Is weekly or monthly better for DRIP investors?",
        answer:
          "Weekly payments let a dividend reinvestment plan compound slightly more often, which can compound marginally faster over long periods — though the difference is generally small compared to the underlying yield and price performance.",
      },
      {
        question: "How do I know if an ETF pays weekly or monthly?",
        answer:
          "Each ETF's own CRADY profile and dividend guide page states its actual payout frequency, based on its real, observed payment history — not just the issuer's stated intent.",
      },
    ],
    relatedEtfsQuery: {
      heading: "Weekly and Monthly Payers by Yield",
      filter: (e) => e.payoutFrequency === "weekly" || e.payoutFrequency === "monthly",
      sort: byYieldDesc,
      limit: 8,
    },
  },
  "yieldmax-guide": {
    slug: "yieldmax-guide",
    title: "YieldMax ETF Guide | How YieldMax Funds Work",
    h1: "YieldMax ETF Guide",
    description:
      "How YieldMax's covered-call income ETFs are structured, how their distribution announcements work, and a current, data-driven list of YieldMax funds ranked by yield.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is YieldMax?</h2>
          <p>
            YieldMax is an ETF issuer that runs a large family of single-stock and index-based
            options-income funds, most using a synthetic covered call strategy to generate high
            distributions from option premium rather than from the underlying company&apos;s own
            dividends. Many YieldMax funds target well-known, high-volatility stocks, since option
            premium income tends to be richer on more volatile underlyings.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">How YieldMax ETFs Work</h2>
          <p>
            See{" "}
            <Link href="/magazine/covered-call-etf-guide" className="underline hover:text-black">
              What Is a Covered Call ETF?
            </Link>{" "}
            for the general mechanics. Most YieldMax funds distribute weekly or monthly, and CRADY
            tracks each fund&apos;s actual payment history to compute a real, trailing-90-day
            run-rate yield rather than repeating the issuer&apos;s own projected figure.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">
            Distribution Announcements &amp; Group Releases
          </h2>
          <p>
            YieldMax frequently announces distributions for several funds together in a single
            release. CRADY&apos;s{" "}
            <Link href="/distributions" className="underline hover:text-black">
              Official Distribution Center
            </Link>{" "}
            tracks these announcements as they&apos;re published, alongside each fund&apos;s own CRADY
            prediction, so you can see the official figure the moment it&apos;s released.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice. CRADY is
          not affiliated with YieldMax.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "What strategy do YieldMax ETFs use?",
        answer:
          "Most use a synthetic covered call strategy built from options on a target stock or index, rather than owning the underlying shares directly — designed to generate high current income from option premium.",
      },
      {
        question: "How often do YieldMax ETFs pay distributions?",
        answer:
          "It varies by fund — many pay weekly, others monthly. Each fund's own CRADY page shows its actual observed payout frequency and full payment history.",
      },
      {
        question: "Are YieldMax distributions guaranteed?",
        answer:
          "No. Distributions depend on option premium income and fund performance, and can vary or decline period to period. CRADY's next-dividend predictions are statistical estimates, not guarantees.",
      },
    ],
    relatedEtfsQuery: {
      heading: "YieldMax ETFs by Yield",
      filter: (e) => e.provider_id === "yieldmax",
      sort: byYieldDesc,
      limit: 8,
    },
  },
  "distribution-schedule-guide": {
    slug: "distribution-schedule-guide",
    title: "Dividend Distribution Schedule Guide | How Payment Schedules Work",
    h1: "Distribution Schedule Guide",
    description:
      "How dividend ETF distribution schedules are set, the difference between an issuer's officially-published schedule and CRADY's statistical prediction, and how to read one.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is a Distribution Schedule?</h2>
          <p>
            A distribution schedule is the sequence of ex-dividend dates and payment dates an ETF
            follows for its distributions — see the{" "}
            <Link href="/magazine/ex-dividend-date-guide" className="underline hover:text-black">
              Ex-Dividend Date Guide
            </Link>{" "}
            and{" "}
            <Link href="/magazine/payment-date-guide" className="underline hover:text-black">
              Payment Date Guide
            </Link>{" "}
            for what each date means individually. Covered-call income ETFs typically follow a
            regular weekly or monthly cadence, though the exact dates can shift around holidays or
            market closures.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">
            Official Schedule vs. CRADY Prediction
          </h2>
          <p>
            When an issuer has officially published its next ex-date and pay-date, CRADY uses that
            real, confirmed schedule directly. When no official schedule has been published yet,
            CRADY estimates the next dates from the statistical pattern (interval and median) of
            that fund&apos;s own past payments — always labeled with a confidence score and the
            method used, and never presented as a confirmed date.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Where to See a Fund&apos;s Schedule</h2>
          <p>
            Every ETF&apos;s own CRADY page shows its next expected ex-date and pay-date, and the{" "}
            <Link href="/calendar" className="underline hover:text-black">
              Dividend Calendar
            </Link>{" "}
            aggregates upcoming dates across every tracked ETF in one place.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "How far in advance are distribution schedules known?",
        answer:
          "It varies by issuer and fund — some publish official schedules weeks ahead, others confirm dates closer to the ex-date. When no official date exists yet, CRADY shows a statistically-estimated date instead, clearly labeled as a prediction.",
      },
      {
        question: "Can a distribution schedule change?",
        answer:
          "Yes — issuers can adjust upcoming ex-dates or pay-dates, particularly around holidays or unusual market conditions. CRADY updates each fund's page as soon as new official information is available.",
      },
      {
        question: "Where can I see every ETF's upcoming schedule at once?",
        answer:
          "The CRADY Dividend Calendar lists upcoming ex-dividend and payment dates across every tracked ETF, sorted chronologically.",
      },
    ],
    relatedEtfsQuery: {
      heading: "ETFs With an Upcoming Predicted Payment",
      filter: (e) => e.nextPredictedDate != null,
      sort: bySoonestPrediction,
      limit: 8,
    },
  },
  "ex-dividend-date-guide": {
    slug: "ex-dividend-date-guide",
    title: "Ex-Dividend Date Guide | What It Means and Why It Matters",
    h1: "Ex-Dividend Date Guide",
    description:
      "What an ex-dividend date is, why you must own shares before it to receive a distribution, and how it differs from the record date and payment date.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is an Ex-Dividend Date?</h2>
          <p>
            The ex-dividend date (&quot;ex-date&quot;) is the first day a share trades{" "}
            <em>without</em> the right to the next declared distribution. To receive that
            distribution, you must own the shares before the ex-date — buying on or after it means
            you&apos;ll receive the following distribution instead, not this one.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Why It Matters</h2>
          <p>
            The ex-date is the single most important date for timing a purchase around a specific
            distribution. It&apos;s also common for a fund&apos;s share price to drop by roughly the
            distribution amount on the ex-date itself, since the fund&apos;s net asset value falls by
            the cash paid out.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">
            Ex-Date vs. Record Date vs. Payment Date
          </h2>
          <p>
            The record date is when the fund checks its records to determine who officially owns
            shares (and is therefore entitled to the distribution) — for US-listed ETFs this
            typically falls right around the ex-date under current settlement rules. The{" "}
            <Link href="/magazine/payment-date-guide" className="underline hover:text-black">
              payment date
            </Link>{" "}
            is the separate, later date the cash actually arrives.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Do I need to hold shares through the payment date to get paid?",
        answer:
          "No — you only need to own shares before the ex-dividend date. You can sell any time after the ex-date and still receive the distribution on the payment date, since your entitlement was locked in at the ex-date.",
      },
      {
        question: "Why does an ETF's price often drop on the ex-dividend date?",
        answer:
          "Because the fund's net asset value decreases by roughly the amount of cash it's paying out. This is a mechanical price adjustment, not necessarily a sign of declining fund performance.",
      },
      {
        question: "Is the ex-date the same as the record date?",
        answer:
          "They're closely related but not identical — under current US settlement conventions the ex-date typically falls on or immediately relative to the record date, but they are technically distinct concepts.",
      },
    ],
    relatedEtfsQuery: {
      heading: "ETFs With an Upcoming Predicted Ex-Date",
      filter: (e) => e.nextPredictedExDate != null,
      sort: (a, b) => (a.nextPredictedExDate! < b.nextPredictedExDate! ? -1 : 1),
      limit: 8,
    },
  },
  "payment-date-guide": {
    slug: "payment-date-guide",
    title: "Dividend Payment Date Guide | When You Actually Get Paid",
    h1: "Payment Date Guide",
    description:
      "What a dividend payment date is, how it relates to the ex-dividend date, and what to do if a payment seems delayed.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is a Payment Date?</h2>
          <p>
            The payment date (&quot;pay date&quot;) is when the distribution cash is actually
            deposited into your brokerage account — distinct from the{" "}
            <Link href="/magazine/ex-dividend-date-guide" className="underline hover:text-black">
              ex-dividend date
            </Link>
            , which only determines whether you&apos;re entitled to that distribution in the first
            place.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">
            From Ex-Date to Payment Date
          </h2>
          <p>
            There&apos;s typically a gap of several days to a couple of weeks between a fund&apos;s
            ex-date and its payment date, depending on the issuer&apos;s own settlement process.
            CRADY shows both dates together on every ETF&apos;s page and on the{" "}
            <Link href="/calendar" className="underline hover:text-black">
              Dividend Calendar
            </Link>
            .
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">If a Payment Seems Late</h2>
          <p>
            Brokerages can take a business day or two to post a distribution after the official
            payment date. If a payment is significantly overdue, check the issuer&apos;s own
            official announcement (linked from CRADY&apos;s{" "}
            <Link href="/distributions" className="underline hover:text-black">
              Official Distribution Center
            </Link>{" "}
            when available) before contacting your brokerage.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "How long after the ex-date is the payment date?",
        answer:
          "It varies by issuer and fund, typically a few days to a couple of weeks. Each ETF's own CRADY page shows both its ex-date and pay-date together.",
      },
      {
        question: "Is the predicted payment date guaranteed?",
        answer:
          "Only when it's based on an issuer's official published schedule. When CRADY estimates a payment date statistically (no official schedule yet), it's labeled as a prediction with a confidence score, not a confirmed date.",
      },
      {
        question: "What should I do if I haven't received an expected payment?",
        answer:
          "Allow a business day or two after the official payment date for your brokerage to post it, then check the issuer's own official announcement before assuming there's an issue.",
      },
    ],
    relatedEtfsQuery: {
      heading: "ETFs With an Upcoming Predicted Payment Date",
      filter: (e) => e.nextPredictedDate != null,
      sort: bySoonestPrediction,
      limit: 8,
    },
  },
  "distribution-rate-guide": {
    slug: "distribution-rate-guide",
    title: "Distribution Rate Guide | What It Means and Its Limits",
    h1: "Distribution Rate Guide",
    description:
      "What an ETF's distribution rate is, how it differs from SEC yield and CRADY's run-rate yield, and why a high distribution rate alone doesn't tell the whole story.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is Distribution Rate?</h2>
          <p>
            Distribution rate is an issuer-published figure that annualizes a fund&apos;s most
            recent distribution (or a short trailing window) and expresses it as a percentage of
            the current share price. It&apos;s a snapshot, not a long-term average — a single unusually
            large or small distribution can swing it noticeably.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">
            Distribution Rate vs. SEC Yield vs. CRADY&apos;s Run-Rate Yield
          </h2>
          <p>
            See the{" "}
            <Link href="/magazine/sec-yield-guide" className="underline hover:text-black">
              SEC Yield Guide
            </Link>{" "}
            for how the SEC&apos;s standardized 30-day yield differs. CRADY&apos;s own annualized
            yield figure (shown on every ETF page) uses a trailing-90-day actual-payment run-rate
            instead of a single recent distribution, specifically to smooth out one-off swings that
            a simple distribution-rate figure can&apos;t.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Why It Can Be Misleading</h2>
          <p>
            Because distribution rate annualizes a short, recent window, a fund with an
            unusually large one-time payment can show a temporarily inflated distribution rate that
            doesn&apos;t reflect its typical payment pattern. Comparing several ETFs&apos; distribution
            rates directly can be misleading for exactly this reason — CRADY&apos;s{" "}
            <Link href="/ranking" className="underline hover:text-black">
              ETF Ranking
            </Link>{" "}
            uses the smoothed run-rate yield instead for that reason. Official, per-distribution
            rate figures (when published) are tracked on CRADY&apos;s{" "}
            <Link href="/distributions" className="underline hover:text-black">
              Official Distribution Center
            </Link>
            .
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Is distribution rate the same as yield?",
        answer:
          "Related but not identical. Distribution rate typically annualizes one recent distribution; a yield figure (like CRADY's) can instead average actual payments over a longer trailing window, which smooths out one-off swings.",
      },
      {
        question: "Why do two similar ETFs show very different distribution rates?",
        answer:
          "Because distribution rate reacts quickly to a single recent payment. A fund that just made an unusually large or small distribution will show a distribution rate that doesn't reflect its typical pattern.",
      },
      {
        question: "Where can I see an ETF's official distribution rate?",
        answer:
          "CRADY's Official Distribution Center tracks per-distribution figures, including distribution rate, when an issuer publishes them alongside an official announcement.",
      },
    ],
    relatedEtfsQuery: {
      heading: "ETFs With the Highest Run-Rate Yield",
      filter: (e) => e.annualYieldPct != null,
      sort: byYieldDesc,
      limit: 8,
    },
  },
  "sec-yield-guide": {
    slug: "sec-yield-guide",
    title: "30-Day SEC Yield Guide | What It Is and Why It's Often Low on Covered Call ETFs",
    h1: "SEC Yield Guide",
    description:
      "What the SEC's standardized 30-Day Yield measures, how it differs from distribution rate, and why covered-call income ETFs often report a low SEC yield despite high distributions.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is 30-Day SEC Yield?</h2>
          <p>
            30-Day SEC Yield is a standardized calculation the SEC requires funds to publish,
            based on a fund&apos;s net investment income (like bond interest or stock dividends)
            over the trailing 30 days, divided by its share price. It exists specifically so
            investors can compare funds on an apples-to-apples basis.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">
            Why Covered-Call ETFs Often Show a Low SEC Yield
          </h2>
          <p>
            The SEC Yield formula is built around traditional investment income (interest and
            qualified dividends) and generally does <em>not</em> count option premium income the
            way a covered-call fund&apos;s actual{" "}
            <Link href="/magazine/distribution-rate-guide" className="underline hover:text-black">
              distribution rate
            </Link>{" "}
            does. That&apos;s why a fund can post a double-digit distribution rate while reporting a
            near-zero (or even zero) 30-Day SEC Yield — the two figures are measuring genuinely
            different things, not disagreeing about the same thing.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Which Figure Should You Use?</h2>
          <p>
            Neither figure alone tells the whole story. SEC Yield is the standardized,
            regulator-defined figure for comparing traditional income funds; distribution rate and
            CRADY&apos;s own run-rate yield better reflect what an options-income fund actually pays
            out in cash, which is usually the more relevant number for these funds specifically.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Why is a fund's SEC yield so much lower than its distribution rate?",
        answer:
          "Because the standardized SEC Yield formula generally doesn't count option premium income, which is the primary source of most covered-call ETFs' actual cash distributions. The two figures measure different things.",
      },
      {
        question: "Is SEC yield a better or worse number than distribution rate?",
        answer:
          "Neither — they answer different questions. SEC Yield is a regulator-standardized figure useful for comparing traditional income funds; for options-income ETFs specifically, distribution rate and actual-payment run-rate yield better reflect real cash paid out.",
      },
      {
        question: "Do all ETFs report a 30-Day SEC Yield?",
        answer:
          "Most registered funds do, since it's an SEC requirement, though the figure isn't always prominently published or up to date for every fund. CRADY's Official Distribution Center tracks it when available.",
      },
    ],
    relatedEtfsQuery: {
      heading: "High Run-Rate-Yield ETFs Where This Gap Is Largest",
      filter: (e) => e.annualYieldPct != null,
      sort: byYieldDesc,
      limit: 8,
    },
  },
  "nav-erosion-guide": {
    slug: "nav-erosion-guide",
    title: "NAV Erosion Guide | Why Covered Call ETF Share Prices Can Decline",
    h1: "NAV Erosion Guide",
    description:
      "What NAV erosion is, why it happens in covered-call and options-income ETFs, and how to evaluate whether a fund's distributions are outpacing its share-price decline.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is NAV Erosion?</h2>
          <p>
            Net Asset Value (NAV) erosion is a gradual decline in a fund&apos;s share price over
            time, separate from any single ex-dividend price drop. For income-focused ETFs, the
            key question isn&apos;t whether the share price ever falls — it&apos;s whether total
            return (distributions plus price change) has been positive or negative over your
            holding period.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">
            Why It Happens in Covered-Call ETFs
          </h2>
          <p>
            A covered-call strategy caps upside (see the{" "}
            <Link href="/magazine/covered-call-etf-guide" className="underline hover:text-black">
              Covered Call ETF Guide
            </Link>
            ) while remaining exposed to downside in the underlying. If the underlying declines,
            or even just trades sideways while the fund distributes a large share of its option
            income as cash, the share price can drift downward over time even as the fund keeps
            paying distributions.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">How to Evaluate It</h2>
          <p>
            Look at price trend alongside distribution history, not distributions alone — CRADY&apos;s
            CRADY Score explicitly factors in price volatility and maximum drawdown for exactly
            this reason, so a fund with an eye-catching yield but poor underlying price stability
            scores lower than a similarly-high-yielding but steadier fund. Check{" "}
            <Link href="/ranking" className="underline hover:text-black">
              the ETF Ranking
            </Link>{" "}
            to compare funds on that combined basis rather than yield alone.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not investment advice.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Does NAV erosion mean a fund is a bad investment?",
        answer:
          "Not necessarily on its own — what matters is total return (distributions plus price change) over your actual holding period, not price decline in isolation. It does mean high distributions alone aren't a complete picture of performance.",
      },
      {
        question: "How can I tell if a fund is experiencing significant NAV erosion?",
        answer:
          "Compare its price trend over 6-12 months against its distribution total for the same period. CRADY's CRADY Score already factors in volatility and maximum drawdown to help surface this at a glance.",
      },
      {
        question: "Do all covered-call ETFs experience NAV erosion?",
        answer:
          "The degree varies significantly by fund, underlying, and market conditions — it isn't universal or guaranteed, but it's a structural risk inherent to the strategy that's worth checking for specifically.",
      },
    ],
    relatedEtfsQuery: {
      heading: "Higher-Risk-Classified ETFs Worth Reviewing Closely",
      filter: (e) => e.riskLevel === "RISKY" || e.riskLevel === "EXTREME",
      sort: (a, b) => (b.volatility30d ?? -1) - (a.volatility30d ?? -1),
      limit: 6,
    },
  },
  "return-of-capital-guide": {
    slug: "return-of-capital-guide",
    title: "Return of Capital (ROC) Guide | What It Means for Your Dividend ETF",
    h1: "Return of Capital Guide",
    description:
      "What return of capital (ROC) means on a dividend ETF's distribution, how it differs from income, and why it lowers your cost basis rather than being taxed immediately.",
    body: (
      <>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3">What Is Return of Capital?</h2>
          <p>
            Return of capital (ROC) is the portion of a distribution classified as giving you back
            your own originally-invested principal, rather than paying you income or a capital
            gain. It&apos;s a common component of covered-call and options-income ETF distributions.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">ROC vs. Income</h2>
          <p>
            Unlike ordinary income or capital gains, ROC isn&apos;t taxed in the year you receive
            it. Instead, it reduces your cost basis in the shares — which means a larger taxable
            capital gain (or smaller loss) when you eventually sell. It doesn&apos;t disappear
            untaxed forever; it defers the tax event rather than eliminating it.
          </p>
        </section>
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-3 mt-8">Tax Implications</h2>
          <p>
            See the{" "}
            <Link href="/magazine/tax-guide" className="underline hover:text-black">
              Covered Call ETF Dividend Tax Guide
            </Link>{" "}
            for the full breakdown of how ROC, ordinary income, and capital gains typically show up
            together on a fund&apos;s 1099-DIV, and why the actual tax owed on a distribution is
            often less than the full cash amount received.
          </p>
        </section>
        <p className="text-sm text-[var(--gray-500)] mt-8 border-t border-[var(--gray-200)] pt-4">
          This page is educational and general in nature — it is not tax advice. Consult a
          qualified tax professional for guidance specific to your situation.
        </p>
      </>
    ),
    faqItems: [
      {
        question: "Is return of capital bad?",
        answer:
          "Not inherently — it's a normal, common component of many funds' distributions, especially options-income ETFs. It becomes a concern mainly if it signals the fund is distributing more cash than it's genuinely generating in income and gains over the long run.",
      },
      {
        question: "Do I pay tax on return of capital?",
        answer:
          "Not immediately. ROC reduces your cost basis instead of being taxed as received, which generally means a larger capital gain (or smaller loss) is realized when you eventually sell the shares — the tax is deferred, not eliminated.",
      },
      {
        question: "How do I know how much of my distribution was return of capital?",
        answer:
          "Your brokerage's 1099-DIV breaks distributions down by category. CRADY's Official Distribution Center also tracks ROC percentage on official announcements when the issuer publishes it.",
      },
    ],
    relatedEtfsQuery: {
      heading: "High-Yield ETFs Where ROC Commonly Applies",
      filter: (e) => e.annualYieldPct != null,
      sort: byYieldDesc,
      limit: 8,
    },
  },
};

export const STANDALONE_PAGE_IDS = Object.keys(STANDALONE_PAGES) as StandalonePageId[];

export function isStandalonePageSlug(slug: string): slug is StandalonePageId {
  return slug in STANDALONE_PAGES;
}
