import Link from "next/link";
import { providerLabel } from "@/lib/data";
import { Badge } from "@/components/ui/Badge";
import { DataStatusBadge } from "./DataStatusBadge";
import type { HoldingResult } from "@/lib/portfolio/types";

/** CRADY ETF Card — Phase 1 basic version. Deliberately NOT the full
 * rarity/archetype/deck-swap/share-image system from the "추가 요구사항"
 * spec; those are a substantial separate system left for a later phase.
 * This is the plain, functional card §1 needs to show a holding's public
 * ETF data alongside its personalized numbers, visually separated. */

const T = {
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  frequency: { en: "Frequency", ko: "배당 주기" },
  asOf: { en: "As of", ko: "" },
  asOfSuffix: { en: "", ko: " 기준" },
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

export function HoldingCard({ result, lang = "en" }: { result: HoldingResult; lang?: "en" | "ko" }) {
  const { holding, resolved } = result;
  const up = (n: number | null) => n != null && n >= 0;

  return (
    <div className="card-interactive rounded-2xl border border-[var(--gray-200)] bg-white overflow-hidden">
      {/* Public ETF data — same for every user who holds this ticker. */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/${holding.ticker.toLowerCase()}`} className="text-xl font-black tracking-tight hover:underline">
              {holding.ticker}
            </Link>
            {result.name && <div className="text-sm text-[var(--gray-500)]">{result.name}</div>}
          </div>
          {result.providerId && (
            <span className="shrink-0 px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-xs font-medium">
              {providerLabel(result.providerId)}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="text-caption">{lang === "ko" ? "현재가" : "Price"}</div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums">
              {result.currentPrice != null ? `$${result.currentPrice.toFixed(2)}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-caption">{T.cradyScore[lang]}</div>
            <div className="mt-0.5 text-lg font-extrabold tabular-nums text-[var(--crady-accent)]">
              {result.cradyScore != null ? result.cradyScore.toFixed(1) : "—"}
            </div>
          </div>
          <div>
            <div className="text-caption">{T.frequency[lang]}</div>
            <div className="mt-0.5 text-lg font-extrabold">{result.payoutFrequency ?? "—"}</div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <DataStatusBadge status={result.priceStatus} lang={lang} staleDays={result.priceStaleDays} />
          {result.asOfDate && (
            <span className="text-[11px] text-[var(--gray-400)]">
              {lang === "ko" ? `${result.asOfDate}${T.asOfSuffix.ko}` : `${T.asOf.en} ${result.asOfDate}`}
            </span>
          )}
        </div>
      </div>

      {/* Personalized position data — visually distinct section (tinted
          background) so it's never confused with the public ETF data
          above. */}
      <div className="border-t border-[var(--gray-200)] bg-[var(--gray-50)] p-4 sm:p-5">
        <div className="text-caption mb-2">{T.yourPosition[lang]}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.shares[lang]}</div>
            <div className="font-semibold tabular-nums">{resolved ? resolved.shares.toFixed(4).replace(/\.?0+$/, "") : "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.purchaseDate[lang]}</div>
            <div className="font-semibold tabular-nums">{holding.purchaseDate}</div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.avgPrice[lang]}</div>
            <div className="font-semibold tabular-nums">
              {resolved ? `$${resolved.effectivePrice.toFixed(2)}` : "—"}
              {resolved?.isEstimatedPrice && (
                <span className="text-[10px] text-[var(--gray-400)] font-normal"> ({T.estimated[lang]})</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.invested[lang]}</div>
            <div className="font-semibold tabular-nums">
              {resolved ? `$${resolved.investmentAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
            </div>
          </div>
        </div>

        {resolved?.isEstimatedPrice && (
          <p className="mt-2 text-[11px] text-[var(--gray-500)]">
            {resolved.dateAdjusted
              ? lang === "ko"
                ? `${holding.purchaseDate}는 휴장일이라 가장 가까운 이전 거래일(${resolved.effectiveDate})의 종가로 추정했습니다.`
                : `Estimated from the nearest available closing price on ${resolved.effectiveDate} (${holding.purchaseDate} was not a trading day).`
              : lang === "ko"
                ? `${resolved.effectiveDate} 종가를 기준으로 추정한 가격입니다.`
                : `Estimated from the closing price on ${resolved.effectiveDate}.`}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-[var(--gray-200)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.currentValue[lang]}</div>
            <div className="font-bold tabular-nums">
              {result.currentValue != null ? `$${result.currentValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.dividends[lang]}</div>
            <div className="font-bold tabular-nums text-[#92400e]">
              ${result.totalDividendsReceived.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.priceReturn[lang]}</div>
            <div className={`font-bold tabular-nums ${up(result.priceReturnPct) ? "text-emerald-700" : "text-red-700"}`}>
              {result.priceReturnPct != null ? `${up(result.priceReturnPct) ? "▲" : "▼"} ${result.priceReturnPct.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--gray-500)]">{T.totalReturn[lang]}</div>
            <div className={`font-bold tabular-nums ${up(result.totalReturnPct) ? "text-emerald-700" : "text-red-700"}`}>
              {result.totalReturnPct != null ? `${up(result.totalReturnPct) ? "▲" : "▼"} ${result.totalReturnPct.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>

        {result.splitWarnings.length > 0 && (
          <div className="mt-3">
            <Badge variant="red">
              {lang === "ko" ? "액면분할 가능성 감지됨" : "Possible unrecorded stock split detected"}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
