"use client";

import { useWatchlist } from "@/lib/watchlist/useWatchlist";
import { EtfCard } from "@/components/etf/EtfCard";
import { snapshotToCardData } from "@/lib/etf/toCardData";
import type { EtfSnapshot } from "@/lib/data";
import { CardCarousel, CarouselItem } from "@/components/etf/CardCarousel";

const T = {
  title: { en: "My Watchlist", ko: "내 관심종목" },
  subtitle: {
    en: "Saved in this browser — tap the star on any card to add or remove.",
    ko: "이 브라우저에 저장됩니다 — 카드의 별표를 눌러 추가/제거하세요.",
  },
} as const;

/** §6 — "My Watchlist" appears on Home's first screen, browser-only, no
 * login. Takes the page's already-fetched snapshot array as a prop (no
 * new query) and filters client-side against localStorage tickers, so it
 * renders nothing server-side and hydrates in without a fetch waterfall. */
export function WatchlistSection({ snapshot, lang = "en" }: { snapshot: EtfSnapshot[]; lang?: "en" | "ko" }) {
  const { tickers } = useWatchlist();
  if (tickers.length === 0) return null;

  const byTicker = new Map(snapshot.map((s) => [s.ticker, s]));
  const held = tickers.map((t) => byTicker.get(t)).filter((s): s is EtfSnapshot => !!s);
  if (held.length === 0) return null;

  return (
    <CardCarousel title={T.title[lang]} subtitle={T.subtitle[lang]}>
      {held.map((etf) => (
        <CarouselItem key={etf.ticker}>
          <EtfCard data={snapshotToCardData(etf)} compact lang={lang} />
        </CarouselItem>
      ))}
    </CardCarousel>
  );
}
