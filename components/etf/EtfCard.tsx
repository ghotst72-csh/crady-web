import Link from "next/link";
import { providerLabel } from "@/lib/data";
import { DataStatusBadge } from "@/components/portfolio/DataStatusBadge";
import type { PriceDataStatus } from "@/lib/portfolio/types";

/** CRADY Engagement & Intelligence Phase 2, Part C — the shared, public
 * ETF Card. One data model and one component, reused wherever an ETF
 * needs a compact visual summary (currently: Portfolio Analyzer; designed
 * to extend to ticker detail / ranking / related-ETF contexts without a
 * second implementation). Deliberately NOT the full rarity/archetype/
 * deck-swap/share-image system from the spec's "추가 요구사항" — this ships
 * the plain, functional card; the game-like layer is a separate, larger
 * piece of work left for a later phase (see the deployment report). */

const ETF_TYPE_LABEL: Record<string, string> = {
  "single-stock-covered-call": "Single-Stock Covered Call",
  "index-covered-call": "Index Covered Call",
  "traditional-dividend": "Traditional Dividend",
  "treasury-bond": "Treasury / Bond",
};

const T = {
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  income: { en: "Income", ko: "인컴" },
  stability: { en: "Stability", ko: "안정성" },
  riskDefense: { en: "Risk Defense", ko: "위험 방어력" },
  growth: { en: "Growth", ko: "성장성" },
  asOf: { en: "As of", ko: "" },
  asOfSuffix: { en: "", ko: " 기준" },
  today: { en: "Today", ko: "오늘" },
  yourPosition: { en: "Your Position", ko: "보유 정보" },
  shares: { en: "Shares", ko: "보유 수량" },
  purchaseDate: { en: "Purchase Date", ko: "매수일" },
  avgPrice: { en: "Avg. Price", ko: "평균 매수가" },
  invested: { en: "Invested", ko: "투자금액" },
  currentValue: { en: "Current Value", ko: "현재 평가금액" },
  dividends: { en: "Dividends", ko: "배당금" },
  priceReturn: { en: "Price Return", ko: "가격 수익률" },
  totalReturn: { en: "Total Return", ko: "총수익률" },
  estimated: { en: "estimated", ko: "추정" },
} as const;

export type EtfCardData = {
  ticker: string;
  name: string | null;
  providerId: string | null;
  etfType: string | null;
  currentPrice: number | null;
  todayChangePct: number | null;
  annualYieldPct: number | null;
  cradyScore: number | null;
  incomeScore: number | null;
  stabilityScore: number | null;
  riskDefenseScore: number | null;
  growthScore: number | null;
  payoutFrequency: string | null;
  riskLevel: string | null;
  asOfDate: string | null;
  priceStatus: PriceDataStatus;
  priceStaleDays: number | null;
};

export type EtfCardPosition = {
  shares: number;
  purchaseDate: string;
  avgPrice: number;
  isEstimatedPrice: boolean;
  investmentAmount: number;
  currentValue: number | null;
  dividendsReceived: number;
  priceReturnPct: number | null;
  totalReturnPct: number | null;
};

function SubScore({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--gray-500)]">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value != null ? value.toFixed(0) : "—"}</div>
    </div>
  );
}

export function EtfCard({
  data,
  position,
  lang = "en",
}: {
  data: EtfCardData;
  position?: EtfCardPosition | null;
  lang?: "en" | "ko";
}) {
  const up = (data.todayChangePct ?? 0) >= 0;

  return (
    <div className="card-interactive rounded-2xl border border-[var(--gray-200)] bg-white overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/${data.ticker.toLowerCase()}`} className="text-xl font-black tracking-tight hover:underline">
              {data.ticker}
            </Link>
            {data.name && <div className="text-sm text-[var(--gray-500)]">{data.name}</div>}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {data.providerId && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-[11px] font-medium">
                  {providerLabel(data.providerId)}
                </span>
              )}
              {data.etfType && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-[11px]">
                  {ETF_TYPE_LABEL[data.etfType] ?? data.etfType}
                </span>
              )}
              {data.payoutFrequency && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-[11px]">
                  {data.payoutFrequency}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold tabular-nums">{data.currentPrice != null ? `$${data.currentPrice.toFixed(2)}` : "—"}</div>
            {data.todayChangePct != null && (
              <div className={`text-xs font-semibold tabular-nums ${up ? "text-emerald-700" : "text-red-700"}`}>
                {up ? "▲" : "▼"} {Math.abs(data.todayChangePct).toFixed(2)}% {T.today[lang]}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          <div>
            <div className="text-[10px] text-[var(--gray-500)]">{T.cradyScore[lang]}</div>
            <div className="text-sm font-bold tabular-nums text-[var(--crady-accent)]">
              {data.cradyScore != null ? data.cradyScore.toFixed(1) : "—"}
            </div>
          </div>
          <SubScore label={T.income[lang]} value={data.incomeScore} />
          <SubScore label={T.stability[lang]} value={data.stabilityScore} />
          <SubScore label={T.riskDefense[lang]} value={data.riskDefenseScore} />
          <SubScore label={T.growth[lang]} value={data.growthScore} />
        </div>

        {data.annualYieldPct != null && (
          <div className="mt-2 text-sm">
            <span className="font-bold text-[#92400e] tabular-nums">{data.annualYieldPct.toFixed(1)}%</span>
            <span className="text-[var(--gray-500)]"> {lang === "ko" ? "연환산 분배율" : "annualized yield"}</span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <DataStatusBadge status={data.priceStatus} lang={lang} staleDays={data.priceStaleDays} />
          {data.asOfDate && (
            <span className="text-[11px] text-[var(--gray-400)]">
              {lang === "ko" ? `${data.asOfDate}${T.asOfSuffix.ko}` : `${T.asOf.en} ${data.asOfDate}`}
            </span>
          )}
        </div>
      </div>

      {position && (
        <div className="border-t border-[var(--gray-200)] bg-[var(--gray-50)] p-4 sm:p-5">
          <div className="text-caption mb-2">{T.yourPosition[lang]}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.shares[lang]}</div>
              <div className="font-semibold tabular-nums">{position.shares.toFixed(4).replace(/\.?0+$/, "")}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.purchaseDate[lang]}</div>
              <div className="font-semibold tabular-nums">{position.purchaseDate}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.avgPrice[lang]}</div>
              <div className="font-semibold tabular-nums">
                ${position.avgPrice.toFixed(2)}
                {position.isEstimatedPrice && <span className="text-[10px] text-[var(--gray-400)] font-normal"> ({T.estimated[lang]})</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.invested[lang]}</div>
              <div className="font-semibold tabular-nums">${position.investmentAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--gray-200)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.currentValue[lang]}</div>
              <div className="font-bold tabular-nums">
                {position.currentValue != null ? `$${position.currentValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.dividends[lang]}</div>
              <div className="font-bold tabular-nums text-[#92400e]">${position.dividendsReceived.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.priceReturn[lang]}</div>
              <div className={`font-bold tabular-nums ${(position.priceReturnPct ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {position.priceReturnPct != null ? `${position.priceReturnPct >= 0 ? "▲" : "▼"} ${Math.abs(position.priceReturnPct).toFixed(1)}%` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--gray-500)]">{T.totalReturn[lang]}</div>
              <div className={`font-bold tabular-nums ${(position.totalReturnPct ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {position.totalReturnPct != null ? `${position.totalReturnPct >= 0 ? "▲" : "▼"} ${Math.abs(position.totalReturnPct).toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
