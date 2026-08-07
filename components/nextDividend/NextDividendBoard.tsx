"use client";

import { useMemo, useState } from "react";
import { Search, CalendarDays, Flame, FastForward, CheckCircle2, Hourglass, Zap } from "lucide-react";
import type { NextDividendBoardEntry } from "@/lib/ticker/nextDividendBoard";
import { computeSummaryStats } from "@/lib/ticker/nextDividendBoard";
import { NextDividendCard } from "./NextDividendCard";
import { NextDividendSummary } from "./NextDividendSummary";

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
  sections: {
    payingToday: { en: "Paying Today", ko: "오늘 지급" },
    confirmedUpcoming: { en: "Confirmed — Upcoming", ko: "확정 — 예정" },
    awaiting: { en: "Awaiting Announcement", ko: "발표 대기" },
  },
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

/** Section header used only on the "All" tab — grouping by real status
 * (which the card badges already show) rather than flattening every
 * tracked ETF into one undifferentiated 68-card list. */
function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 mt-6 mb-2.5 first:mt-0 text-[12px] font-bold text-[var(--gray-500)] uppercase tracking-wide">
      {icon}
      {label}
      <span className="text-[var(--gray-400)] font-semibold normal-case">({count})</span>
    </div>
  );
}

function CardGrid({ entries, lang, basePath }: { entries: NextDividendBoardEntry[]; lang: "en" | "ko"; basePath: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {entries.map((entry) => (
        <NextDividendCard key={entry.ticker} entry={entry} lang={lang} basePath={basePath} />
      ))}
    </div>
  );
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

  const summaryStats = useMemo(() => computeSummaryStats(entries), [entries]);

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

  const showSections = tab === "all" && query.trim() === "";
  const payingToday = showSections ? filtered.filter((e) => e.status === "paying-today") : [];
  const confirmedUpcoming = showSections ? filtered.filter((e) => e.status === "confirmed") : [];
  const awaiting = showSections ? filtered.filter((e) => e.status === "estimated" || e.status === "paid") : [];

  return (
    <div>
      <NextDividendSummary stats={summaryStats} lang={lang} />

      <div className="relative mt-5">
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
      ) : showSections ? (
        <div className="mt-1">
          <SectionHeader
            icon={<Zap size={13} strokeWidth={2.5} className="text-[#92400e]" fill="currentColor" aria-hidden="true" />}
            label={T.sections.payingToday[lang]}
            count={payingToday.length}
          />
          {payingToday.length > 0 && <CardGrid entries={payingToday} lang={lang} basePath={basePath} />}

          <SectionHeader
            icon={<CheckCircle2 size={13} strokeWidth={2.5} className="text-emerald-700" aria-hidden="true" />}
            label={T.sections.confirmedUpcoming[lang]}
            count={confirmedUpcoming.length}
          />
          {confirmedUpcoming.length > 0 && <CardGrid entries={confirmedUpcoming} lang={lang} basePath={basePath} />}

          <SectionHeader
            icon={<Hourglass size={13} strokeWidth={2.5} className="text-[var(--gray-500)]" aria-hidden="true" />}
            label={T.sections.awaiting[lang]}
            count={awaiting.length}
          />
          {awaiting.length > 0 && <CardGrid entries={awaiting} lang={lang} basePath={basePath} />}
        </div>
      ) : (
        <div className="mt-3">
          <CardGrid entries={filtered} lang={lang} basePath={basePath} />
        </div>
      )}
    </div>
  );
}
