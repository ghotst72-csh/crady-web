import Link from "next/link";
import {
  DollarSign,
  Megaphone,
  Calendar,
  Wallet,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import type { NextDividendBoardEntry } from "@/lib/ticker/nextDividendBoard";
import { providerLabel } from "@/lib/providers";
import { formatConfidencePct } from "@/lib/confidence";

const T = {
  nextDividend: { en: "Next Dividend", ko: "다음 배당금" },
  announcement: { en: "Announcement", ko: "발표일" },
  exDividend: { en: "Ex-Dividend", ko: "배당락일" },
  payment: { en: "Payment", ko: "지급일" },
  previous: { en: "Previous", ko: "직전" },
  confidence: { en: "Confidence", ko: "신뢰도" },
  confirmed: { en: "Confirmed", ko: "확정" },
  estimated: { en: "Estimated", ko: "예상" },
  tbd: { en: "TBD", ko: "미정" },
} as const;

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
 * card's 2nd/3rd-priority fields, so every field lines up identically. */
function InfoRow({
  icon,
  label,
  value,
  emphasize = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--gray-400)] shrink-0" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11px] text-[var(--gray-500)] shrink-0">{label}</span>
      <span
        className={`ml-auto text-right ${emphasize ? "font-bold text-[13px]" : "text-[12.5px] text-[var(--gray-700)]"}`}
      >
        {value}
      </span>
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

  return (
    <Link
      href={`${basePath}/${entry.ticker.toLowerCase()}`}
      className="block border border-[var(--gray-200)] rounded-2xl p-4 hover:border-black hover:shadow-sm transition-all bg-white"
    >
      {/* Identity row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-bold text-[15px] truncate">{entry.ticker}</span>
          <span className="text-[11px] text-[var(--gray-400)] truncate">{providerLabel(entry.providerId)}</span>
        </div>
        {entry.isOfficial ? (
          <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={11} strokeWidth={2.5} aria-hidden="true" />
            {T.confirmed[lang]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--gray-100)] text-[var(--gray-600)]">
            <Hourglass size={11} strokeWidth={2.5} aria-hidden="true" />
            {T.estimated[lang]}
          </span>
        )}
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

      {/* Priority 2 — announcement / ex-date / payment */}
      <div className="mt-3 pt-3 border-t border-[var(--gray-100)] space-y-1.5">
        <InfoRow
          icon={<Megaphone size={14} strokeWidth={2} />}
          label={T.announcement[lang]}
          value={fmtShortDate(entry.declarationDate, lang)}
        />
        <InfoRow
          icon={<Calendar size={14} strokeWidth={2} />}
          label={T.exDividend[lang]}
          value={fmtShortDate(entry.exDate, lang)}
          emphasize
        />
        <InfoRow
          icon={<Wallet size={14} strokeWidth={2} />}
          label={T.payment[lang]}
          value={fmtShortDate(entry.payDate, lang)}
          emphasize
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
