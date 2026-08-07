import Link from "next/link";
import {
  DollarSign,
  Megaphone,
  CalendarClock,
  Wallet,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Hourglass,
  Zap,
} from "lucide-react";
import type { NextDividendBoardEntry, NextDividendStatus } from "@/lib/ticker/nextDividendBoard";
import { providerLabel } from "@/lib/providers";
import { formatConfidencePct } from "@/lib/confidence";

const T = {
  nextDividend: { en: "Next Dividend", ko: "다음 배당금" },
  announcement: { en: "Announcement", ko: "발표일" },
  exDividend: { en: "Ex-Dividend", ko: "배당락일" },
  payment: { en: "Payment", ko: "지급일" },
  previous: { en: "Previous", ko: "직전" },
  tbd: { en: "TBD", ko: "미정" },
  status: {
    paid: { en: "Paid", ko: "지급 완료" },
    "paying-today": { en: "Paying Today", ko: "오늘 지급" },
    confirmed: { en: "Confirmed", ko: "확정" },
    estimated: { en: "Awaiting Announcement", ko: "발표 대기" },
  } satisfies Record<NextDividendStatus, Record<"en" | "ko", string>>,
} as const;

const STATUS_BADGE_CLASS: Record<NextDividendStatus, string> = {
  paid: "bg-[var(--gray-100)] text-[var(--gray-500)]",
  "paying-today": "bg-[#92400e] text-white",
  confirmed: "bg-emerald-50 text-emerald-700",
  estimated: "bg-[var(--gray-100)] text-[var(--gray-600)]",
};

function StatusIcon({ status }: { status: NextDividendStatus }) {
  const props = { size: 11, strokeWidth: 2.5, "aria-hidden": true as const };
  if (status === "paying-today") return <Zap {...props} fill="currentColor" />;
  if (status === "confirmed") return <CheckCircle2 {...props} />;
  if (status === "paid") return <CheckCircle2 {...props} />;
  return <Hourglass {...props} />;
}

function fmtMoney(n: number | null): string {
  return n != null ? `$${n.toFixed(4)}` : "—";
}

function fmtShortDate(iso: string | null, lang: "en" | "ko"): string {
  if (!iso) return T.tbd[lang];
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** One row of icon + label + value — the shared building block for the
 * card's 2nd-priority date fields. Icon size/weight/color intentionally
 * escalate from Announcement (smallest, lightest — the "FYI" date) to
 * Payment (largest, boldest, ink-dark — the date the money actually
 * moves) so the three are distinguishable at a glance without resorting
 * to different hues per row. */
function InfoRow({
  icon,
  label,
  value,
  valueWeight = "font-semibold",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueWeight?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 shrink-0 flex items-center justify-center text-[var(--gray-400)]" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11px] text-[var(--gray-500)] shrink-0">{label}</span>
      <span className={`ml-auto text-right text-[13px] text-[var(--gray-800)] ${valueWeight}`}>{value}</span>
    </div>
  );
}

export function NextDividendCard({
  entry,
  lang = "en",
  basePath = "",
}: {
  entry: NextDividendBoardEntry;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const trendUp = entry.changeFromLastPct != null && entry.changeFromLastPct > 0.5;
  const trendDown = entry.changeFromLastPct != null && entry.changeFromLastPct < -0.5;
  const payingToday = entry.status === "paying-today";

  return (
    <Link
      href={`${basePath}/${entry.ticker.toLowerCase()}`}
      className={`block rounded-2xl p-4 hover:shadow-sm transition-all bg-white border ${
        payingToday ? "border-[#92400e]/30 hover:border-[#92400e]" : "border-[var(--gray-200)] hover:border-black"
      }`}
    >
      {/* Identity row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-bold text-[15px] truncate">{entry.ticker}</span>
          <span className="text-[11px] text-[var(--gray-400)] truncate">{providerLabel(entry.providerId)}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_BADGE_CLASS[entry.status]}`}
        >
          <StatusIcon status={entry.status} />
          {T.status[entry.status][lang]}
        </span>
      </div>

      {/* Priority 1 — the number the whole card exists for */}
      <div className="mt-2.5 flex items-center gap-2">
        <DollarSign size={22} className="text-[#92400e] shrink-0" strokeWidth={2.5} aria-hidden="true" />
        <div>
          <div className="text-3xl font-black text-[#92400e] tabular-nums leading-none">
            {fmtMoney(entry.amount)}
          </div>
          <div className="text-[11px] text-[var(--gray-500)] mt-1">{T.nextDividend[lang]}</div>
        </div>
      </div>

      {/* Priority 2 — announcement / ex-date / payment, escalating icon weight */}
      <div className="mt-3 pt-3 border-t border-[var(--gray-100)] space-y-2">
        <InfoRow
          icon={<Megaphone size={12} strokeWidth={1.75} />}
          label={T.announcement[lang]}
          value={fmtShortDate(entry.declarationDate, lang)}
          valueWeight="font-medium text-[var(--gray-600)]"
        />
        <InfoRow
          icon={<CalendarClock size={14} strokeWidth={2} className="text-[var(--gray-500)]" />}
          label={T.exDividend[lang]}
          value={fmtShortDate(entry.exDate, lang)}
        />
        <InfoRow
          icon={<Wallet size={16} strokeWidth={2.25} className="text-[#92400e]" />}
          label={T.payment[lang]}
          value={fmtShortDate(entry.payDate, lang)}
          valueWeight="font-extrabold text-[13.5px] text-[var(--gray-900)]"
        />
      </div>

      {/* Priority 3 — previous / change / confidence */}
      <div className="mt-3 pt-3 border-t border-[var(--gray-100)] flex items-center justify-between text-[11px] text-[var(--gray-500)]">
        <div className="flex items-center gap-3">
          <span>
            {T.previous[lang]} {fmtMoney(entry.previousAmount)}
          </span>
          {entry.changeFromLastPct != null && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                trendUp ? "text-emerald-700" : trendDown ? "text-red-600" : "text-[var(--gray-500)]"
              }`}
            >
              {trendUp ? (
                <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" />
              ) : trendDown ? (
                <TrendingDown size={12} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Minus size={12} strokeWidth={2.5} aria-hidden="true" />
              )}
              {entry.changeFromLastPct >= 0 ? "+" : ""}
              {entry.changeFromLastPct.toFixed(1)}%
            </span>
          )}
        </div>
        {entry.confidence != null && (
          <span className="inline-flex items-center gap-1">
            <Target size={12} strokeWidth={2} aria-hidden="true" />
            {formatConfidencePct(entry.confidence, 0)}
          </span>
        )}
      </div>
    </Link>
  );
}
