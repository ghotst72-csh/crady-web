"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getWatchlistSnapshot, onWatchlistChange, toggleWatched } from "./storage";

const emptySnapshot: string[] = [];

/** Client-only hook backing the star button and "My Watchlist" home
 * section — reads/writes lib/watchlist/storage.ts's localStorage list.
 * useSyncExternalStore (not useEffect+setState) so every mounted consumer
 * re-renders in the same commit when any of them toggles a ticker. */
export function useWatchlist() {
  const tickers = useSyncExternalStore(
    onWatchlistChange,
    getWatchlistSnapshot,
    () => emptySnapshot
  );

  const toggle = useCallback((ticker: string) => {
    toggleWatched(ticker);
  }, []);

  return { tickers, toggle, isWatched: (ticker: string) => tickers.includes(ticker.toUpperCase()) };
}
