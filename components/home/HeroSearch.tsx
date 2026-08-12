"use client";

import Link from "next/link";
import { TickerSearch } from "../search/TickerSearch";
import type { SearchEntry } from "@/lib/search/searchTickers";

const T = {
  headline: { en: "High-Yield ETF Intelligence", ko: "고배당 ETF 인텔리전스" },
  subhead: {
    en: "Real-time dividends. Accurate predictions. Smarter investing.",
    ko: "실시간 배당, 정확한 예측, 더 스마트한 투자.",
  },
  popular: { en: "Popular:", ko: "인기:" },
} as const;

/** Homepage hero (CRADY Homepage Final Redesign, 2026-08-12) — the page's
 * one real, visible `<h1>` (replacing the previous `sr-only` hack now that
 * this genuinely is the page's headline), a large search box, and a
 * data-derived "Popular" ticker row. `popularTickers` is computed by the
 * caller from the already-fetched snapshot (top-N by CRADY Score) — never
 * hard-coded, per the approved design's own "real data only" rule. */
export function HeroSearch({
  searchIndex,
  popularTickers,
  lang = "en",
  basePath = "",
}: {
  searchIndex: SearchEntry[];
  popularTickers: string[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 to-white border border-blue-100/60 px-6 sm:px-10 py-10 sm:py-14 text-center">
      {/* Purely decorative ascending trend line, matching the approved
          hero design — no data behind it, hidden from assistive tech.
          2026-08-12 polish pass: enlarged and vertically centered (was
          pinned to the top-right corner, which read as a disconnected
          sticker once the hero got shorter) and lowered opacity so it
          reads as an ambient background element rather than competing
          with the headline/search for attention. */}
      <svg
        aria-hidden="true"
        className="hidden lg:block absolute top-1/2 right-10 -translate-y-1/2 opacity-40"
        width="200"
        height="88"
        viewBox="0 0 160 70"
        fill="none"
      >
        <polyline
          points="0,60 30,45 55,50 80,28 105,34 130,10 158,4"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[
          [0, 60],
          [30, 45],
          [55, 50],
          [80, 28],
          [105, 34],
          [130, 10],
          [158, 4],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="#2563EB" />
        ))}
      </svg>

      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--gray-900)]">
        {T.headline[lang]}
      </h1>
      <p className="mt-2.5 text-sm sm:text-base text-[var(--gray-600)]">{T.subhead[lang]}</p>

      <div className="mt-6 max-w-xl mx-auto">
        <TickerSearch
          index={searchIndex}
          lang={lang}
          basePath={basePath}
          accentClassName="text-blue-600"
          inputClassName="!py-3 !pl-11 !pr-11 !text-base !bg-white !border-[var(--gray-200)] shadow-sm"
        />
      </div>

      {popularTickers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-[var(--gray-500)]">{T.popular[lang]}</span>
          {popularTickers.map((ticker) => (
            <Link
              key={ticker}
              href={`${basePath}/${ticker.toLowerCase()}`}
              className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors"
            >
              {ticker}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
