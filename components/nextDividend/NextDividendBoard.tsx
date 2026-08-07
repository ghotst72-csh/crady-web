"use client";

import { useMemo, useState } from "react";
import { Search, CalendarDays, Flame, FastForward, CheckCircle2, Hourglass } from "lucide-react";
import type { NextDividendBoardEntry } from "@/lib/ticker/nextDividendBoard";
import { NextDividendCard } from "./NextDividendCard";

type TabId = "all" | "this-week" | "next-week" | "confirmed" | "estimated";

const T = {
  searchPlaceholder: {
    en: "Search ticker — TSLY, MSTY, CONY...",
    ko: "티커 검색 — TSLY, MSTY, CONY...",
  },
  tabs: {
    all: { en: "All", ko: "전체" },
    "this-week": { en: "This Week", ko: "이번 주" },
    "next-week": { en: "Next Week", ko: "다음 주" },
    confirmed: { en: "Confirmed", ko: "확정" },
    estimated: { en: "Estimated", ko: "예상" },
  },
  count: { en: "ETFs", ko: "개 ETF" },
  empty: { en: "No ETFs match this filter.", ko: "조건에 맞는 ETF가 없습니다." },
} as const;

const TAB_ICON: Record<TabId, React.ReactNode> = {
  all: <CalendarDays size={14} strokeWidth={2} aria-hidden="true" />,
  "this-week": <Flame size={14} strokeWidth={2} aria-hidden="true" />,
  "next-week": <FastForward size={14} strokeWidth={2} aria-hidden="true" />,
  confirmed: <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />,
  estimated: <Hourglass size={14} strokeWidth={2} aria-hidden="true" />,
};

function daysFromToday(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00Z");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function NextDividendBoard({
  entries,
  lang = "en",
  basePath = "",
}: {
  entries: NextDividendBoardEntry[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (q && !e.ticker.toLowerCase().includes(q) && !(e.name ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (tab === "confirmed") return e.isOfficial;
      if (tab === "estimated") return !e.isOfficial;
      if (tab === "this-week" || tab === "next-week") {
        const d = daysFromToday(e.payDate);
        if (d == null) return false;
        return tab === "this-week" ? d >= 0 && d < 7 : d >= 7 && d < 14;
      }
      return true;
    });
  }, [entries, tab, query]);

  const tabs: TabId[] = ["all", "this-week", "next-week", "confirmed", "estimated"];

  return (
    <div>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={T.searchPlaceholder[lang]}
          aria-label={T.searchPlaceholder[lang]}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] placeholder:text-[var(--gray-400)] outline-none transition-colors focus:bg-white focus:border-black"
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
              tab === id
                ? "bg-black text-white border-black"
                : "border-[var(--gray-200)] text-[var(--gray-600)] hover:border-black hover:text-black"
            }`}
          >
            {TAB_ICON[id]}
            {T.tabs[id][lang]}
          </button>
        ))}
      </div>

      <div className="mt-3 text-xs text-[var(--gray-500)]">
        {filtered.length} {T.count[lang]}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--gray-500)] text-center py-12">{T.empty[lang]}</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((entry) => (
            <NextDividendCard key={entry.ticker} entry={entry} lang={lang} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
}
