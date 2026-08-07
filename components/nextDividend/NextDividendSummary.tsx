import { CalendarDays, ShieldCheck, Hourglass, Flame } from "lucide-react";
import type { NextDividendSummaryStats } from "@/lib/ticker/nextDividendBoard";

const T = {
  thisWeek: { en: "Paying This Week", ko: "이번 주 지급" },
  confirmed: { en: "Confirmed Amount", ko: "금액 확정" },
  awaiting: { en: "Awaiting Announcement", ko: "발표 대기" },
  highest: { en: "Highest Dividend", ko: "최고 배당금" },
  etfs: { en: "ETFs", ko: "개" },
} as const;

function fmtMoney(n: number): string {
  return `$${n.toFixed(4)}`;
}

/** The "grasp this week in 3 seconds" strip — real counts computed from
 * the same board data the card grid below renders (lib/ticker/
 * nextDividendBoard.ts::computeSummaryStats), never a separate or
 * fabricated number. Deliberately plain KPI tiles (bold number + small
 * icon-led label) rather than a second card style, so it reads as a
 * dashboard header, not another row of the same list. */
export function NextDividendSummary({ stats, lang = "en" }: { stats: NextDividendSummaryStats; lang?: "en" | "ko" }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <div className="border border-[var(--gray-200)] rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
          <CalendarDays size={13} strokeWidth={2} aria-hidden="true" />
          {T.thisWeek[lang]}
        </div>
        <div className="mt-1 text-xl font-black tabular-nums">{stats.thisWeekCount}</div>
      </div>

      <div className="border border-[var(--gray-200)] rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
          <ShieldCheck size={13} strokeWidth={2} aria-hidden="true" />
          {T.confirmed[lang]}
        </div>
        <div className="mt-1 text-xl font-black tabular-nums text-emerald-700">{stats.confirmedCount}</div>
      </div>

      <div className="border border-[var(--gray-200)] rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
          <Hourglass size={13} strokeWidth={2} aria-hidden="true" />
          {T.awaiting[lang]}
        </div>
        <div className="mt-1 text-xl font-black tabular-nums text-[var(--gray-600)]">{stats.awaitingCount}</div>
      </div>

      <div className="border border-[var(--gray-200)] rounded-xl p-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
          <Flame size={13} strokeWidth={2} aria-hidden="true" />
          {T.highest[lang]}
        </div>
        {stats.highest ? (
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black tabular-nums text-[#92400e]">{fmtMoney(stats.highest.amount)}</span>
            <span className="text-[11px] font-bold text-[var(--gray-500)]">{stats.highest.ticker}</span>
          </div>
        ) : (
          <div className="mt-1 text-xl font-black text-[var(--gray-300)]">—</div>
        )}
      </div>
    </div>
  );
}
