"use client";

import { useState } from "react";
import { Sparkline } from "@/components/ui/Sparkline";
import type { PriceSummary, PriceWindowId } from "@/lib/ticker/priceSummary";

/** ETF Detail Page v3, requirements #1 + #2 — big current price, today's
 * change, and a tiny tabbed sparkline. A real "1D" window isn't possible
 * (etf_price_history is daily-close only, no intraday feed — see the doc
 * comment on lib/ticker/priceSummary.ts), so the tabs are 1W/1M/3M with 1W
 * as the default; "today's change" is still shown as an exact number
 * either way. Client component only for the tab click state — everything
 * it renders is server-computed real data passed in as props. */

const WINDOWS: PriceWindowId[] = ["1W", "1M", "3M"];

const T = {
  today: { en: "Today", ko: "오늘" },
  notEnoughData: { en: "Not enough data yet", ko: "데이터가 충분하지 않습니다" },
} as const;

export function PriceBlock({
  summary,
  asOfLabel,
  lang = "en",
}: {
  summary: PriceSummary;
  asOfLabel: string | null;
  lang?: "en" | "ko";
}) {
  const [activeWindow, setActiveWindow] = useState<PriceWindowId>("1W");
  const { currentPrice, todayChangePct } = summary;
  if (currentPrice == null) return null;

  const up = todayChangePct != null && todayChangePct >= 0;
  const activeStat = summary.windows[activeWindow];

  return (
    <div>
      <div className="flex items-end gap-2.5 flex-wrap">
        <div className="text-hero-number text-5xl sm:text-6xl leading-none">
          ${currentPrice.toFixed(2)}
        </div>
        {todayChangePct != null && (
          <span
            className={`inline-flex items-center gap-1 text-sm sm:text-base font-bold tabular-nums px-2 py-1 rounded-lg ${
              up ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
            }`}
          >
            {up ? "▲" : "▼"} {Math.abs(todayChangePct).toFixed(2)}% {T.today[lang]}
          </span>
        )}
      </div>
      {asOfLabel && <div className="mt-1 text-xs text-[var(--gray-500)]">{asOfLabel}</div>}

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-[var(--gray-200)] p-0.5 text-xs font-semibold">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setActiveWindow(w)}
              aria-pressed={activeWindow === w}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeWindow === w
                  ? "bg-black text-white"
                  : "text-[var(--gray-500)] hover:text-black"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
        {activeStat.sparkline.length >= 2 ? (
          <div className="flex items-center gap-2">
            <Sparkline values={activeStat.sparkline} width={110} height={32} color="auto" />
            {activeStat.changePct != null && (
              <span
                className={`text-xs font-bold tabular-nums ${
                  activeStat.changePct >= 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {activeStat.changePct >= 0 ? "+" : ""}
                {activeStat.changePct.toFixed(1)}%
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--gray-400)]">{T.notEnoughData[lang]}</span>
        )}
      </div>
    </div>
  );
}
