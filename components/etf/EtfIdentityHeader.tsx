import { ExternalLink } from "lucide-react";
import { providerLabel } from "@/lib/data";
import { isUsMarketOpen } from "@/lib/ticker/marketStatus";
import { WatchlistStar, FollowShareButtons } from "./EtfFollowShareControls";

const T = {
  marketOpen: { en: "Market Open", ko: "장중" },
  marketClosed: { en: "Market Closed", ko: "장마감" },
  distribution: { en: (freq: string) => `${freq} Distribution`, ko: (freq: string) => `${freq} 분배` },
} as const;

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatAsOf(dateStr: string | null, lang: "en" | "ko"): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** CRADY ETF Detail UI (reference-locked) — the compact, persistent
 * identity header: ticker, name, provider/frequency badges on the left;
 * price + today's change + market status + Follow/Share on the right.
 * Deliberately dense (spec: "최대한 compact하게 만든다. 거대한 hero
 * section 금지.") — no description paragraph, no large hero treatment. */
export function EtfIdentityHeader({
  ticker,
  name,
  providerId,
  payoutFrequency,
  sourceUrl,
  currentPrice,
  todayChangePct,
  todayChangeAbs,
  asOfDate,
  lang = "en",
}: {
  ticker: string;
  name: string | null;
  providerId: string;
  payoutFrequency: string | null;
  sourceUrl: string | null;
  currentPrice: number | null;
  todayChangePct: number | null;
  todayChangeAbs: number | null;
  asOfDate: string | null;
  lang?: "en" | "ko";
}) {
  const up = (todayChangePct ?? 0) >= 0;
  const marketOpen = isUsMarketOpen();
  const asOfLabel = formatAsOf(asOfDate, lang);
  const hasFrequency = payoutFrequency != null && payoutFrequency.trim().toLowerCase() !== "unknown";

  return (
    <section className="mx-auto max-w-[1400px] px-6 pt-5 pb-4">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[32px] sm:text-[34px] font-bold tracking-tight leading-none">{ticker}</h1>
            <WatchlistStar ticker={ticker} lang={lang} />
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[15px] text-[var(--gray-500)]">
            {name && <span>{name}</span>}
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={ticker}>
                <ExternalLink size={14} strokeWidth={2} className="text-[var(--gray-400)] hover:text-[var(--gray-600)]" />
              </a>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-xs font-medium">
              {providerLabel(providerId)}
            </span>
            {hasFrequency && (
              <span className="px-2.5 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-xs font-medium">
                {T.distribution[lang](capitalize(payoutFrequency!))}
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <FollowShareButtons ticker={ticker} lang={lang} />
          {currentPrice != null && (
            <div className="mt-2.5 flex items-baseline justify-end gap-2">
              <span className="text-2xl font-bold tabular-nums">${currentPrice.toFixed(2)}</span>
              {todayChangePct != null && todayChangeAbs != null && (
                <span className={`text-base font-semibold tabular-nums ${up ? "text-emerald-600" : "text-red-600"}`}>
                  {up ? "+" : ""}
                  {todayChangeAbs.toFixed(2)} ({up ? "+" : ""}
                  {todayChangePct.toFixed(2)}%)
                </span>
              )}
            </div>
          )}
          <div className="mt-1 text-sm text-[var(--gray-500)]">
            {marketOpen ? T.marketOpen[lang] : T.marketClosed[lang]}
            {asOfLabel && ` · ${asOfLabel} 04:00 PM ET`}
          </div>
        </div>
      </div>
    </section>
  );
}
