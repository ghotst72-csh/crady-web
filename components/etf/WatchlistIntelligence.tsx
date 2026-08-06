"use client";

import Link from "next/link";
import { useWatchlist } from "@/lib/watchlist/useWatchlist";
import type { AutomatedActivityItem } from "@/lib/activity/types";

const T = {
  title: { en: "My Watchlist — Today", ko: "내 관심종목 — 오늘" },
} as const;

/** CRADY Intelligence 4.0, Item #13 — filters the Home page's already-
 * fetched "changes today" array (same data Home Intelligence uses) by the
 * user's localStorage watchlist tickers — zero new fetch, same pattern as
 * WatchlistSection.tsx. Renders nothing if the user has no watchlist, or
 * none of their watched tickers had a real change today (honest empty
 * state, not shown as an error). */
export function WatchlistIntelligence({
  changeEventsToday,
  lang = "en",
  basePath = "",
}: {
  changeEventsToday: AutomatedActivityItem[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const { tickers } = useWatchlist();
  if (tickers.length === 0) return null;

  const watched = new Set(tickers);
  const relevant = changeEventsToday.filter((e) => watched.has(e.ticker.toUpperCase()));
  if (relevant.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold mb-3">{T.title[lang]}</h2>
      <ul className="space-y-2">
        {relevant.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <Link href={`${basePath}/${item.ticker.toLowerCase()}`} className="font-semibold hover:underline shrink-0">
              {item.ticker}
            </Link>
            <span className="text-[var(--gray-600)] text-right">{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
