"use client";

import { useState } from "react";
import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

type Criterion = "crady" | "yield" | "safety" | "growth";

const CRITERION_LABEL: Record<Criterion, { en: string; ko: string }> = {
  crady: { en: "CRADY Score", ko: "CRADY Score" },
  yield: { en: "Distribution Yield", ko: "Distribution Yield" },
  safety: { en: "Safety", ko: "Safety" },
  growth: { en: "Growth", ko: "Growth" },
};

const METRIC_LABEL: Record<Criterion, { en: string; ko: string }> = {
  crady: { en: "CRADY Score", ko: "CRADY 점수" },
  yield: { en: "Distribution Yield", ko: "연환산 분배율" },
  safety: { en: "Dividend Stability", ko: "배당 안정성" },
  growth: { en: "vs Last Payment", ko: "직전 대비 증감" },
};

const T = {
  topN: { en: "Top", ko: "" },
  by: { en: "ETFs by", ko: "기준 상위" },
  count: { en: "", ko: "개 ETF" },
  empty: { en: "No ETFs match this criteria yet.", ko: "해당 조건의 ETF가 아직 없습니다." },
  leaderEyebrow: {
    en: (label: string) => `#1 by ${label}`,
    ko: (label: string) => `${label} 1위`,
  },
} as const;

function metricFor(etf: EtfSnapshot, criterion: Criterion, lang: "en" | "ko") {
  switch (criterion) {
    case "crady":
      return { label: METRIC_LABEL.crady[lang], value: etf.cradyScore?.toFixed(1) ?? "—" };
    case "yield":
      return {
        label: METRIC_LABEL.yield[lang],
        value: etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—",
      };
    case "safety":
      return {
        label: METRIC_LABEL.safety[lang],
        value: etf.dividendStabilityScore != null ? etf.dividendStabilityScore.toFixed(1) : "—",
      };
    case "growth":
      return {
        label: METRIC_LABEL.growth[lang],
        value:
          etf.dividendTrendPct != null
            ? `${etf.dividendTrendPct > 0 ? "+" : ""}${etf.dividendTrendPct.toFixed(1)}%`
            : "—",
      };
  }
}

export function RankingTable({
  rankings,
  lang = "en",
  basePath = "",
}: {
  rankings: Record<Criterion, EtfSnapshot[]>;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const [criterion, setCriterion] = useState<Criterion>("crady");
  const list = rankings[criterion];
  const leader = list[0];
  const leaderMetric = leader ? metricFor(leader, criterion, lang) : null;

  return (
    <div>
      {/* Hero moment — the page's single most important fact (today's #1 by
          whichever criterion is selected) before any list. */}
      {leader && leaderMetric && (
        <Link
          href={`${basePath}/${leader.ticker.toLowerCase()}`}
          className="group block border border-[var(--gray-200)] rounded-2xl p-5 sm:p-6 mb-5 bg-gradient-to-br from-[var(--gray-50)] to-white hover:border-black transition-colors"
        >
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
            {T.leaderEyebrow[lang](CRITERION_LABEL[criterion][lang])}
          </div>
          <div className="mt-2 flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl sm:text-5xl font-black text-[var(--crady-accent)] leading-none">
              {leaderMetric.value}
            </span>
            <span className="text-xl sm:text-2xl font-bold group-hover:underline">{leader.ticker}</span>
            {leader.riskLevel && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                {RISK_LABEL[lang][leader.riskLevel] ?? leader.riskLevel}
              </span>
            )}
          </div>
          <div className="text-sm text-[var(--gray-500)] mt-1">
            {providerLabel(leader.provider_id)}
            {leader.name ? ` · ${leader.name}` : ""}
          </div>
        </Link>
      )}

      <div className="flex gap-1 border border-[var(--gray-200)] rounded-lg p-1 w-fit overflow-x-auto max-w-full">
        {(Object.keys(CRITERION_LABEL) as Criterion[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCriterion(key)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
              criterion === key
                ? "bg-black text-white font-semibold"
                : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
            }`}
          >
            {CRITERION_LABEL[key][lang]}
          </button>
        ))}
      </div>

      <p className="text-sm text-[var(--gray-500)] mt-3">
        {lang === "ko"
          ? `${CRITERION_LABEL[criterion].ko} ${T.by.ko} ${list.length}${T.count.ko}`
          : `${T.topN.en} ${list.length} ETFs ${T.by.en} ${CRITERION_LABEL[criterion].en}`}
      </p>

      <div className="mt-3 border border-[var(--gray-200)] rounded-xl overflow-hidden xl:border-0 xl:rounded-none xl:overflow-visible xl:grid xl:grid-cols-2 xl:gap-3">
        {list.map((etf, i) => {
          const metric = metricFor(etf, criterion, lang);
          return (
            <Link
              key={etf.ticker}
              href={`${basePath}/${etf.ticker.toLowerCase()}`}
              className="flex items-center gap-3 sm:gap-4 px-4 py-3 border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-50)] transition-colors xl:border xl:border-[var(--gray-200)] xl:rounded-xl xl:hover:border-black"
            >
              <span className="w-5 shrink-0 text-[var(--gray-400)] text-sm font-medium">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{etf.ticker}</span>
                  {etf.riskLevel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] shrink-0">
                      {RISK_LABEL[lang][etf.riskLevel] ?? etf.riskLevel}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--gray-500)] truncate">
                  {providerLabel(etf.provider_id)}
                  {etf.name ? ` · ${etf.name}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-[var(--crady-accent)]">
                  {metric.value}
                </div>
                <div className="text-[10px] text-[var(--gray-400)] hidden sm:block">
                  {metric.label}
                </div>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[var(--gray-400)]">
            {T.empty[lang]}
          </div>
        )}
      </div>
    </div>
  );
}
