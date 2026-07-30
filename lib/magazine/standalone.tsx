import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqItem } from "./types";

/** Genuinely provider/ticker-agnostic educational content (tax treatment,
 * how to buy) is nearly identical across all 72 tickers CRADY covers —
 * generating 72 near-duplicate per-ticker pages for it would be exactly the
 * "keyword-swapped page" pattern the Magazine 2.0 spec explicitly rules
 * out. Built as ONE comprehensive page per topic instead, cross-linked from
 * every ticker's guide page, which is the standard, Google-guideline-
 * compliant way to capture that search intent without doorway pages. */
export type StandalonePageId = "tax-guide" | "how-to-buy";

export type StandalonePageDefinition = {
  slug: StandalonePageId;
  title: string;
  h1: string;
  description: string;
  body: ReactNode;
  faqItems: FaqItem[];
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
};

export const STANDALONE_PAGE_IDS = Object.keys(STANDALONE_PAGES) as StandalonePageId[];

export function isStandalonePageSlug(slug: string): slug is StandalonePageId {
  return slug in STANDALONE_PAGES;
}
