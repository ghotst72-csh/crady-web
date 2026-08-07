"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Target, CheckCircle2, Hourglass, Zap } from "lucide-react";
import type { NextDividendBoardEntry, NextDividendStatus } from "@/lib/ticker/nextDividendBoard";
import { computeSummaryStats } from "@/lib/ticker/nextDividendBoard";
import { providerLabel } from "@/lib/providers";
import { formatConfidencePct } from "@/lib/confidence";

/** CRADY Phase 2 §8 — a real prediction table/terminal, not a "market
 * stall" of dozens of competing cards. Default tab is Predictions (what
 * CRADY expects next), not Paying Today. One shared table on desktop,
 * one compact stacked-row list on mobile — never the old dense
 * NextDividendCard grid, which visually competed with the numbers instead
 * of getting out of their way. */

type TabId = "predictions" | "confirmed" | "paying-today";

const T = {
  searchPlaceholder: { en: "Search ticker — TSLY, MSTY, CONY...", ko: "티커 검색 — TSLY, MSTY, CONY..." },
  tabs: {
    predictions: { en: "Predictions", ko: "예측" },
    confirmed: { en: "Confirmed", ko: "확정" },
    "paying-today": { en: "Paying Today", ko: "오늘 지급" },
  },
  count: { en: "ETFs", ko: "개 ETF" },
  empty: { en: "No ETFs match this filter.", ko: "조건에 맞는 ETF가 없습니다." },
  thisWeek: { en: "Paying this week", ko: "이번 주 지급" },
  confirmedCount: { en: "Confirmed", ko: "확정" },
  awaiting: { en: "Awaiting announcement", ko: "발표 대기" },
  highest: { en: "Highest", ko: "최고" },
  colEtf: { en: "ETF", ko: "ETF" },
  colNextDividend: { en: "Next Dividend Prediction", ko: "다음 배당 예측" },
  colConfidence: { en: "Confidence", ko: "신뢰도" },
  colAnnouncement: { en: "Expected Announcement", ko: "예상 발표일" },
  colExDate: { en: "Ex-Dividend Date", ko: "예상 배당락일" },
  colPayDate: { en: "Payment Date", ko: "예상 지급일" },
  colStatus: { en: "Status", ko: "상태" },
  tbd: { en: "TBD", ko: "미정" },
  status: {
    paid: { en: "Paid", ko: "지급 완료" },
    "paying-today": { en: "Paying Today", ko: "오늘 지급" },
    confirmed: { en: "Confirmed", ko: "확정" },
    estimated: { en: "Estimated", ko: "예상" },
  } satisfies Record<NextDividendStatus, Record<"en" | "ko", string>>,
} as const;

const STATUS_BADGE_CLASS: Record<NextDividendStatus, string> = {
  paid: "bg-[var(--gray-100)] text-[var(--gray-500)]",
  "paying-today": "bg-[#92400e] text-white",
  confirmed: "bg-emerald-50 text-emerald-700",
  estimated: "bg-[var(--crady-accent)]/15 text-[#92400e]",
};

function StatusIcon({ status }: { status: NextDividendStatus }) {
  const props = { size: 11, strokeWidth: 2.5, "aria-hidden": true as const };
  if (status === "paying-today") return <Zap {...props} fill="currentColor" />;
  if (status === "confirmed" || status === "paid") return <CheckCircle2 {...props} />;
  return <Hourglass {...props} />;
}

function StatusBadge({ status, lang }: { status: NextDividendStatus; lang: "en" | "ko" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_BADGE_CLASS[status]}`}
    >
      <StatusIcon status={status} />
      {T.status[status][lang]}
    </span>
  );
}

function fmtMoney(n: number | null): string {
  return n != null ? `$${n.toFixed(4)}` : "—";
}

function fmtDate(iso: string | null, lang: "en" | "ko"): string {
  if (!iso) return T.tbd[lang];
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" });
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
  const [tab, setTab] = useState<TabId>("predictions");
  const [query, setQuery] = useState("");

  const summaryStats = useMemo(() => computeSummaryStats(entries), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (q && !e.ticker.toLowerCase().includes(q) && !(e.name ?? "").toLowerCase().includes(q)) return false;
      if (tab === "predictions") return !e.isOfficial;
      if (tab === "confirmed") return e.isOfficial;
      return e.status === "paying-today";
    });
  }, [entries, tab, query]);

  const tabs: TabId[] = ["predictions", "confirmed", "paying-today"];

  return (
    <div>
      {/* Slim, secondary summary line — real counts, never competing
          visually with the prediction amounts in the table below (spec
          §9: "should not compete visually with the predicted dividend
          amounts"). */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--gray-500)]">
        <span>
          {T.thisWeek[lang]} <strong className="text-black tabular-nums">{summaryStats.thisWeekCount}</strong>
        </span>
        <span>
          {T.confirmedCount[lang]} <strong className="text-black tabular-nums">{summaryStats.confirmedCount}</strong>
        </span>
        <span>
          {T.awaiting[lang]} <strong className="text-black tabular-nums">{summaryStats.awaitingCount}</strong>
        </span>
        {summaryStats.highest && (
          <span>
            {T.highest[lang]}{" "}
            <strong className="text-[#92400e] tabular-nums">${summaryStats.highest.amount.toFixed(4)}</strong>{" "}
            {summaryStats.highest.ticker}
          </span>
        )}
      </div>

      <div className="relative mt-4">
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
            {id === "predictions" && <Target size={14} strokeWidth={2} aria-hidden="true" />}
            {id === "confirmed" && <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />}
            {id === "paying-today" && <Zap size={14} strokeWidth={2} aria-hidden="true" />}
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
        <>
          {/* Desktop / tablet — a real financial table. */}
          <div className="hidden sm:block mt-3 border border-[var(--gray-200)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">{T.colEtf[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colNextDividend[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colConfidence[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colAnnouncement[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colExDate[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colPayDate[lang]}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{T.colStatus[lang]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                  {filtered.map((e) => (
                    <tr key={e.ticker} className="hover:bg-[var(--gray-50)] transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`${basePath}/${e.ticker.toLowerCase()}`} className="font-bold hover:underline">
                          {e.ticker}
                        </Link>
                        <span className="ml-1.5 text-[11px] text-[var(--gray-400)]">{providerLabel(e.providerId)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums text-[#92400e]">{fmtMoney(e.amount)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--gray-600)]">
                        {e.confidence != null ? formatConfidencePct(e.confidence, 0) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--gray-600)]">{fmtDate(e.declarationDate, lang)}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--gray-600)]">{fmtDate(e.exDate, lang)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtDate(e.payDate, lang)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <StatusBadge status={e.status} lang={lang} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile — compact stacked rows, not the full-size card grid. */}
          <div className="sm:hidden mt-3 space-y-2">
            {filtered.map((e) => (
              <Link
                key={e.ticker}
                href={`${basePath}/${e.ticker.toLowerCase()}`}
                className="block border border-[var(--gray-200)] rounded-xl p-3 hover:border-black transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[15px]">{e.ticker}</span>
                  <StatusBadge status={e.status} lang={lang} />
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black text-[#92400e] tabular-nums leading-none">{fmtMoney(e.amount)}</span>
                  <span className="text-xs text-[var(--gray-500)] shrink-0">{fmtDate(e.payDate, lang)}</span>
                </div>
                {e.confidence != null && (
                  <div className="mt-1.5 text-[11px] text-[var(--gray-500)]">
                    {T.colConfidence[lang]} {formatConfidencePct(e.confidence, 0)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
