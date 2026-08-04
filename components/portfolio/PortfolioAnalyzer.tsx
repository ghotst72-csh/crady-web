"use client";

import { useState, useEffect, useTransition } from "react";
import { HoldingInputForm } from "./HoldingInputForm";
import { HoldingCard } from "./HoldingCard";
import { PortfolioSnapshot } from "./PortfolioSnapshot";
import { DividendHistoryTable } from "./DividendHistoryTable";
import { AlternativeComparisonTable } from "./AlternativeComparisonTable";
import { QuickReportCard } from "./QuickReportCard";
import { loadPortfolio, savePortfolio, clearPortfolio } from "@/lib/portfolio/storage";
import { analyzePortfolio, type PortfolioAnalysis } from "@/lib/portfolio/analyze";
import type { Holding } from "@/lib/portfolio/types";
import type { SearchEntry } from "@/lib/search/searchTickers";

const T = {
  storageNote: {
    en: "Your holdings are saved only in this browser (localStorage) — nothing is sent to or stored on CRADY's servers.",
    ko: "보유 정보는 이 브라우저(localStorage)에만 저장되며, CRADY 서버에는 전송되거나 저장되지 않습니다.",
  },
  reset: { en: "Clear all holdings", ko: "전체 초기화" },
  remove: { en: "Remove", ko: "삭제" },
  analyzing: { en: "Analyzing…", ko: "분석 중…" },
  emptyState: {
    en: "Add an ETF you actually hold — purchase date, and either shares or the amount you invested — to see your real total return, dividend-adjusted, compared against real alternatives.",
    ko: "실제로 보유한 ETF, 매수일, 그리고 주식 수 또는 투자금액을 입력하면 배당을 반영한 실제 총수익을 확인하고 실제 대안 상품과 비교할 수 있습니다.",
  },
  unknownTicker: {
    en: (t: string) => `${t} isn't a ticker CRADY tracks yet — check the spelling, or this ETF may not be covered.`,
    ko: (t: string) => `${t}는 CRADY가 아직 추적하지 않는 티커입니다 — 철자를 확인하거나, 아직 지원되지 않는 ETF일 수 있습니다.`,
  },
  notYetListed: {
    en: (t: string, d: string) => `${t} has no price data at or before ${d} — it may not have been listed yet on that date.`,
    ko: (t: string, d: string) => `${t}는 ${d} 시점의 가격 데이터가 없습니다 — 해당 날짜에 아직 상장되지 않았을 수 있습니다.`,
  },
  disclaimer: {
    en: "Informational only, not investment advice. Taxes and trading fees are excluded from these calculations. Past performance does not guarantee future results.",
    ko: "이 정보는 참고용이며 투자 조언이 아닙니다. 세금과 거래 수수료는 계산에서 제외됩니다. 과거 성과가 미래 수익을 보장하지 않습니다.",
  },
} as const;

export function PortfolioAnalyzer({
  searchIndex,
  lang = "en",
  initialTicker,
}: {
  searchIndex: SearchEntry[];
  lang?: "en" | "ko";
  initialTicker?: string;
}) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // localStorage doesn't exist on the server, so this must run after
    // mount, not during render — the sync-with-client-signal case the
    // set-state-in-effect rule intends to allow (same pattern as
    // LanguagePreferenceManager.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoldings(loadPortfolio());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePortfolio(holdings);
    if (holdings.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalysis(null);
      return;
    }
    startTransition(async () => {
      const result = await analyzePortfolio(holdings, lang);
      setAnalysis(result);
    });
    // holdings is the only real dependency — lang changes are handled by
    // the page remount (EN/KO are separate routes), not a client re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, hydrated]);

  function handleAdd(h: Holding) {
    setHoldings((prev) => [...prev, h]);
  }
  function handleRemove(id: string) {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }
  function handleReset() {
    clearPortfolio();
    setHoldings([]);
    setAnalysis(null);
  }

  return (
    <div>
      <HoldingInputForm index={searchIndex} lang={lang} onAdd={handleAdd} defaultTicker={initialTicker} />

      {holdings.length === 0 && !hydrated ? null : holdings.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--gray-500)] max-w-xl">{T.emptyState[lang]}</p>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--gray-500)]">{T.storageNote[lang]}</p>
          <button type="button" onClick={handleReset} className="shrink-0 text-xs text-red-700 hover:underline">
            {T.reset[lang]}
          </button>
        </div>
      )}

      {isPending && <p className="mt-4 text-sm text-[var(--gray-500)]">{T.analyzing[lang]}</p>}

      {analysis && !isPending && (
        <div className="mt-8 space-y-8">
          <PortfolioSnapshot totals={analysis.totals} lang={lang} />
          <QuickReportCard sentences={analysis.quickReport} lang={lang} />

          <div className="space-y-10">
            {analysis.holdingResults.map((r) => (
              <div key={r.holding.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <HoldingCard result={r} lang={lang} />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(r.holding.id)}
                    className="shrink-0 mt-2 text-xs text-[var(--gray-400)] hover:text-red-700"
                  >
                    {T.remove[lang]}
                  </button>
                </div>

                {!r.etfExists && (
                  <p className="text-sm text-red-700">{T.unknownTicker[lang](r.holding.ticker)}</p>
                )}
                {r.etfExists && r.notYetListedAtPurchase && (
                  <p className="text-sm text-red-700">
                    {T.notYetListed[lang](r.holding.ticker, r.holding.purchaseDate)}
                  </p>
                )}

                {r.resolved && (
                  <div className="space-y-6 pl-0 sm:pl-2">
                    <DividendHistoryTable result={r} lang={lang} />
                    <AlternativeComparisonTable
                      result={r}
                      alternatives={analysis.alternativesByHolding[r.holding.id] ?? []}
                      lang={lang}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[var(--gray-400)] border-t border-[var(--gray-200)] pt-4">
            {T.disclaimer[lang]}
          </p>
        </div>
      )}
    </div>
  );
}
