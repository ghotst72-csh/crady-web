"use client";

import { useState } from "react";
import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

type Tab = "crady" | "yield" | "increased";

const TAB_LABEL: Record<Tab, { en: string; ko: string }> = {
  crady: { en: "CRADY Score", ko: "CRADY 점수" },
  yield: { en: "Distribution Yield", ko: "연환산 분배율" },
  increased: { en: "Rising Dividends", ko: "배당 증가" },
};

const T = {
  heading: { en: "Top Rankings", ko: "TOP 랭킹" },
  viewAll: { en: "View Full Ranking →", ko: "전체 랭킹 보기 →" },
  empty: { en: "No ETFs match this criteria yet.", ko: "해당 조건의 ETF가 아직 없습니다." },
  price: { en: "Price", ko: "현재가" },
  growth: { en: "vs last", ko: "직전 대비" },
} as const;

export function RankingPreview({
  cradyTop,
  yieldTop,
  increasedTop,
  lang = "en",
  basePath = "",
}: {
  cradyTop: EtfSnapshot[];
  yieldTop: EtfSnapshot[];
  increasedTop: EtfSnapshot[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const [tab, setTab] = useState<Tab>("crady");

  const dataByTab: Record<Tab, EtfSnapshot[]> = {
    crady: cradyTop,
    yield: yieldTop,
    increased: increasedTop,
  };
  const active = dataByTab[tab].slice(0, 3);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <h2 className="text-lg font-bold mb-4">{T.heading[lang]}</h2>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* w-full + flex-wrap on mobile: at 320px three tab labels ("CRADY
            Score" / "Distribution Yield" / "Rising Dividends") don't fit on
            one line even at text-xs, and this pill previously had no wrap
            or scroll containment — it silently pushed the whole page into
            horizontal overflow. sm+ keeps the original single-line w-fit
            pill unchanged. */}
        <div className="flex flex-wrap sm:flex-nowrap gap-1 border border-[var(--gray-200)] rounded-lg p-1 w-full sm:w-fit">
          {(Object.keys(TAB_LABEL) as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
                tab === key
                  ? "bg-black text-white font-semibold"
                  : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
              }`}
            >
              {TAB_LABEL[key][lang]}
            </button>
          ))}
        </div>
        <Link
          href={`${basePath}/ranking`}
          className="text-sm text-[var(--gray-500)] hover:text-black"
        >
          {T.viewAll[lang]}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {active.map((etf) => (
          <RankPreviewCard key={etf.ticker} etf={etf} tab={tab} lang={lang} basePath={basePath} />
        ))}
        {active.length === 0 && (
          <p className="text-sm text-[var(--gray-400)] col-span-3">{T.empty[lang]}</p>
        )}
      </div>
    </section>
  );
}

function RankPreviewCard({
  etf,
  tab,
  lang,
  basePath,
}: {
  etf: EtfSnapshot;
  tab: Tab;
  lang: "en" | "ko";
  basePath: string;
}) {
  const metric =
    tab === "crady"
      ? { label: TAB_LABEL.crady[lang], value: etf.cradyScore?.toFixed(1) ?? "—" }
      : tab === "yield"
        ? {
            label: TAB_LABEL.yield[lang],
            value: etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—",
          }
        : {
            label: T.growth[lang],
            value:
              etf.dividendTrendPct != null ? `+${etf.dividendTrendPct.toFixed(1)}%` : "—",
          };

  return (
    <Link
      href={`${basePath}/${etf.ticker.toLowerCase()}`}
      className="border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold">{etf.ticker}</div>
          <div className="text-xs text-[var(--gray-500)] truncate">
            {providerLabel(etf.provider_id)}
          </div>
        </div>
        {etf.riskLevel && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
            {RISK_LABEL[lang][etf.riskLevel] ?? etf.riskLevel}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-xs text-[var(--gray-500)]">{metric.label}</div>
        {/* #92400e, not --crady-accent — see components/ui/KpiCard.tsx for why. */}
        <div className="text-xl font-extrabold text-[#92400e]">
          {metric.value}
        </div>
      </div>
      <div className="mt-2 text-xs text-[var(--gray-500)]">
        {T.price[lang]} {etf.price != null ? `$${etf.price.toFixed(2)}` : "—"}
      </div>
    </Link>
  );
}
