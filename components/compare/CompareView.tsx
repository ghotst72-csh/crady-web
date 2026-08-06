"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EtfCard } from "@/components/etf/EtfCard";
import { TickerAutocompleteInput } from "@/components/portfolio/TickerAutocompleteInput";
import type { SearchEntry } from "@/lib/search/searchTickers";
import type { ComparisonPeer } from "@/lib/data";
import { providerLabel } from "@/lib/data";
import { comparisonPeerToCardData } from "@/lib/etf/toCardData";

const T = {
  pickA: { en: "ETF A", ko: "ETF A" },
  pickB: { en: "ETF B", ko: "ETF B" },
  vs: { en: "VS", ko: "VS" },
  placeholder: { en: "Enter a ticker…", ko: "티커 입력…" },
  emptySlot: { en: "Pick a ticker to compare", ko: "비교할 티커를 선택하세요" },
  notFound: { en: "No data for this ticker yet.", ko: "이 티커의 데이터가 아직 없습니다." },
  strip: {
    price: { en: "Price", ko: "가격" },
    yield: { en: "Annual Yield", ko: "연환산 분배율" },
    risk: { en: "Risk", ko: "위험도" },
    income: { en: "Income", ko: "인컴" },
    drawdown: { en: "Max Drawdown", ko: "최대 낙폭" },
    stability: { en: "Stability", ko: "안정성" },
  },
} as const;

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

function StripRow({
  label,
  a,
  b,
  format,
}: {
  label: string;
  a: number | null;
  b: number | null;
  format: (v: number) => string;
}) {
  const aWins = a != null && b != null && a > b;
  const bWins = a != null && b != null && b > a;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 border-b border-[var(--gray-100)] last:border-0">
      <div className={`text-right text-sm font-bold tabular-nums ${aWins ? "text-[#92400e]" : ""}`}>
        {a != null ? format(a) : "—"}
      </div>
      <div className="text-[10px] text-[var(--gray-400)] uppercase tracking-wide px-2 whitespace-nowrap">{label}</div>
      <div className={`text-left text-sm font-bold tabular-nums ${bWins ? "text-[#92400e]" : ""}`}>
        {b != null ? format(b) : "—"}
      </div>
    </div>
  );
}

export function CompareView({
  searchIndex,
  peerA,
  peerB,
  tickerA,
  tickerB,
  lang = "en",
  basePath = "",
}: {
  searchIndex: SearchEntry[];
  peerA: ComparisonPeer | null;
  peerB: ComparisonPeer | null;
  tickerA: string;
  tickerB: string;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const router = useRouter();
  const [inputA, setInputA] = useState(tickerA);
  const [inputB, setInputB] = useState(tickerB);

  function navigate(a: string, b: string) {
    const params = new URLSearchParams();
    if (a) params.set("a", a);
    if (b) params.set("b", b);
    router.push(`${basePath}/compare?${params.toString()}`);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <div>
          <label className="text-xs font-semibold text-[var(--gray-500)]">{T.pickA[lang]}</label>
          <div className="mt-1">
            <TickerAutocompleteInput
              index={searchIndex}
              value={inputA}
              onChange={setInputA}
              onSelect={(t) => {
                setInputA(t);
                navigate(t, tickerB);
              }}
              placeholder={T.placeholder[lang]}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--gray-500)]">{T.pickB[lang]}</label>
          <div className="mt-1">
            <TickerAutocompleteInput
              index={searchIndex}
              value={inputB}
              onChange={setInputB}
              onSelect={(t) => {
                setInputB(t);
                navigate(tickerA, t);
              }}
              placeholder={T.placeholder[lang]}
            />
          </div>
        </div>
      </div>

      {(peerA || peerB) && (
        <div className="mt-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4 lg:items-start">
          <div>
            {peerA ? (
              <EtfCard data={comparisonPeerToCardData(peerA)} lang={lang} />
            ) : tickerA ? (
              <EmptyCardSlot label={T.notFound[lang]} />
            ) : (
              <EmptyCardSlot label={T.emptySlot[lang]} />
            )}
          </div>

          <div className="hidden lg:flex items-center justify-center px-2">
            <span className="text-lg font-black text-[var(--gray-300)]">{T.vs[lang]}</span>
          </div>

          <div className="mt-4 lg:mt-0">
            {peerB ? (
              <EtfCard data={comparisonPeerToCardData(peerB)} lang={lang} />
            ) : tickerB ? (
              <EmptyCardSlot label={T.notFound[lang]} />
            ) : (
              <EmptyCardSlot label={T.emptySlot[lang]} />
            )}
          </div>
        </div>
      )}

      {peerA && peerB && (
        <div className="mt-6 rounded-2xl border border-[var(--gray-200)] bg-white p-4 sm:p-5">
          <div className="grid grid-cols-2 text-center text-xs font-bold text-[var(--gray-500)] pb-2 border-b border-[var(--gray-200)]">
            <span>{peerA.ticker} · {providerLabel(peerA.provider_id)}</span>
            <span>{peerB.ticker} · {providerLabel(peerB.provider_id)}</span>
          </div>
          <StripRow label={T.strip.price[lang]} a={peerA.currentPrice} b={peerB.currentPrice} format={(v) => `$${v.toFixed(2)}`} />
          <StripRow label={T.strip.yield[lang]} a={peerA.annualYieldPct} b={peerB.annualYieldPct} format={(v) => `${v.toFixed(1)}%`} />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 border-b border-[var(--gray-100)]">
            <div className="text-right text-sm font-bold">
              {peerA.riskLevel ? (RISK_LABEL[lang][peerA.riskLevel] ?? peerA.riskLevel) : "—"}
            </div>
            <div className="text-[10px] text-[var(--gray-400)] uppercase tracking-wide px-2 whitespace-nowrap">{T.strip.risk[lang]}</div>
            <div className="text-left text-sm font-bold">
              {peerB.riskLevel ? (RISK_LABEL[lang][peerB.riskLevel] ?? peerB.riskLevel) : "—"}
            </div>
          </div>
          <StripRow label={T.strip.income[lang]} a={peerA.incomeScore} b={peerB.incomeScore} format={(v) => v.toFixed(0)} />
          <StripRow label={T.strip.drawdown[lang]} a={peerA.maxDrawdown} b={peerB.maxDrawdown} format={(v) => `${v.toFixed(1)}%`} />
          <StripRow label={T.strip.stability[lang]} a={peerA.dividendStabilityScore} b={peerB.dividendStabilityScore} format={(v) => v.toFixed(0)} />
        </div>
      )}
    </div>
  );
}

function EmptyCardSlot({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--gray-300)] h-full min-h-[220px] flex items-center justify-center text-center px-4">
      <span className="text-sm text-[var(--gray-400)]">{label}</span>
    </div>
  );
}
