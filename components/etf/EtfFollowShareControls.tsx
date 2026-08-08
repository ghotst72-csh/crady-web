"use client";

import { useState } from "react";
import { Star, Share2 } from "lucide-react";
import { useWatchlist } from "@/lib/watchlist/useWatchlist";

const T = {
  follow: { en: "Follow", ko: "팔로우" },
  following: { en: "Following", ko: "팔로잉" },
  share: { en: "Share", ko: "공유" },
  copied: { en: "Copied!", ko: "복사됨!" },
  addToWatchlist: { en: "Add to watchlist", ko: "관심종목에 추가" },
  removeFromWatchlist: { en: "Remove from watchlist", ko: "관심종목에서 제거" },
} as const;

/** Small inline star next to the ticker (spec §2) — the same watchlist
 * state as FollowShareButtons below, kept in sync via useWatchlist's
 * useSyncExternalStore (both are independent consumers of one store). */
export function WatchlistStar({ ticker, lang = "en" }: { ticker: string; lang?: "en" | "ko" }) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(ticker);
  return (
    <button
      type="button"
      onClick={() => toggle(ticker)}
      aria-pressed={watched}
      aria-label={watched ? T.removeFromWatchlist[lang] : T.addToWatchlist[lang]}
      className="text-[var(--gray-400)] hover:text-indigo-600 transition-colors"
    >
      <Star size={22} strokeWidth={2} fill={watched ? "currentColor" : "none"} className={watched ? "text-indigo-600" : ""} />
    </button>
  );
}

export function FollowShareButtons({ ticker, lang = "en" }: { ticker: string; lang?: "en" | "ko" }) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(ticker);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const shareData = { title: `${ticker} — CRADY`, url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently do nothing rather than error
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => toggle(ticker)}
        aria-pressed={watched}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
          watched
            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
            : "border-[var(--gray-200)] text-[var(--gray-700)] hover:border-[var(--gray-300)]"
        }`}
      >
        <Star size={15} strokeWidth={2} fill={watched ? "currentColor" : "none"} />
        {watched ? T.following[lang] : T.follow[lang]}
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={handleShare}
          aria-label={T.share[lang]}
          className="inline-flex items-center justify-center h-[34px] w-[34px] rounded-lg border border-[var(--gray-200)] text-[var(--gray-600)] hover:border-[var(--gray-300)] transition-colors"
        >
          <Share2 size={15} strokeWidth={2} />
        </button>
        {copied && (
          <div className="absolute right-0 top-full mt-1 px-2 py-1 rounded-md bg-black text-white text-[11px] whitespace-nowrap">
            {T.copied[lang]}
          </div>
        )}
      </div>
    </div>
  );
}
