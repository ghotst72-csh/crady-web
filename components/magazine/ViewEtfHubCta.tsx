import Link from "next/link";

/** Magazine stays the SEO landing surface — this is the one, consistent
 * nudge every per-ticker article gives toward the real destination: the ETF
 * Hub page itself (crady.net/{ticker}), which now carries live price/
 * dividend data, an AI Outlook, and investor activity that no Magazine
 * article duplicates. Not a Magazine redesign — one small card at the end
 * of the article, same placement every time. */
export function ViewEtfHubCta({ ticker }: { ticker: string }) {
  return (
    <div className="mt-6 border border-[var(--gray-200)] rounded-2xl bg-[var(--gray-50)] p-5 flex items-center justify-between gap-4">
      <div>
        <div className="font-bold text-sm">View the Complete {ticker} Hub</div>
        <p className="text-xs text-[var(--gray-600)] mt-0.5">
          Live price, dividend prediction, AI Outlook, and investor discussion — all on one page.
        </p>
      </div>
      <Link
        href={`/${ticker.toLowerCase()}`}
        className="shrink-0 px-4 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-[var(--gray-800)] transition-colors"
      >
        Go to {ticker} →
      </Link>
    </div>
  );
}
