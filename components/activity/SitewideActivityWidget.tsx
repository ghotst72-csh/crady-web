import Link from "next/link";
import type { SitewideActivityHighlights } from "@/lib/activity/data";

const T = {
  mostActive: { en: "Most Active ETFs Today", ko: "오늘 가장 활발한 ETF" },
  latestDistributions: { en: "Latest Distribution Updates", ko: "최신 배당 업데이트" },
  mostDiscussed: { en: "Most Discussed ETFs", ko: "가장 많이 논의된 ETF" },
  newOutlooks: { en: "New CRADY Outlooks", ko: "새로운 CRADY 분석" },
  updates: { en: "updates", ko: "건" },
} as const;

function tickerHref(ticker: string, lang: "en" | "ko"): string {
  return lang === "ko" ? `/ko/${ticker.toLowerCase()}` : `/${ticker.toLowerCase()}`;
}

/** Small, real Activity entry points for Home/Ranking — deliberately NOT a
 * community feed on these pages (product requirement): up to 4 short lists,
 * each capped at a handful of items, each linking straight through to the
 * ETF's own page where the full Activity lives. Renders nothing for a list
 * with no real data, and renders nothing at all if every list is empty —
 * never a placeholder grid. */
export function SitewideActivityWidget({
  highlights,
  lang = "en",
}: {
  highlights: SitewideActivityHighlights;
  lang?: "en" | "ko";
}) {
  const { mostActiveToday, latestDistributions, mostDiscussed, newOutlooks } = highlights;
  const hasAny =
    mostActiveToday.length > 0 || latestDistributions.length > 0 || mostDiscussed.length > 0 || newOutlooks.length > 0;
  if (!hasAny) return null;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {mostActiveToday.length > 0 && (
        <div className="border border-[var(--gray-200)] rounded-xl p-4">
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
            {T.mostActive[lang]}
          </div>
          <ul className="space-y-1.5">
            {mostActiveToday.map((row) => (
              <li key={row.ticker} className="text-sm">
                <Link href={tickerHref(row.ticker, lang)} className="font-semibold hover:underline">
                  {row.ticker}
                </Link>
                <span className="text-[var(--gray-400)]">
                  {" "}
                  · {row.count} {T.updates[lang]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {latestDistributions.length > 0 && (
        <div className="border border-[var(--gray-200)] rounded-xl p-4">
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
            {T.latestDistributions[lang]}
          </div>
          <ul className="space-y-1.5">
            {latestDistributions.map((row) => (
              <li key={row.ticker} className="text-sm">
                <Link href={tickerHref(row.ticker, lang)} className="hover:underline truncate block">
                  <span className="font-semibold">{row.ticker}</span> — {row.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mostDiscussed.length > 0 && (
        <div className="border border-[var(--gray-200)] rounded-xl p-4">
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
            {T.mostDiscussed[lang]}
          </div>
          <ul className="space-y-1.5">
            {mostDiscussed.map((row) => (
              <li key={row.ticker} className="text-sm">
                <Link href={tickerHref(row.ticker, lang)} className="hover:underline truncate block">
                  <span className="font-semibold">{row.ticker}</span> — {row.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {newOutlooks.length > 0 && (
        <div className="border border-[var(--gray-200)] rounded-xl p-4">
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
            {T.newOutlooks[lang]}
          </div>
          <ul className="space-y-1.5">
            {newOutlooks.map((row) => (
              <li key={row.ticker} className="text-sm">
                <Link href={tickerHref(row.ticker, lang)} className="hover:underline truncate block">
                  <span className="font-semibold">{row.ticker}</span> — {row.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
