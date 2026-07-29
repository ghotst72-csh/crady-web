"use client";

import { useState } from "react";
import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";

const RISK_LABEL: Record<string, string> = {
  SAFE: "안정",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "고위험",
};

type Criterion = "crady" | "yield" | "safety" | "growth";

const CRITERIA: { key: Criterion; label: string }[] = [
  { key: "crady", label: "CRADY Score" },
  { key: "yield", label: "Distribution Yield" },
  { key: "safety", label: "Safety" },
  { key: "growth", label: "Growth" },
];

function metricFor(etf: EtfSnapshot, criterion: Criterion) {
  switch (criterion) {
    case "crady":
      return { label: "CRADY 점수", value: etf.cradyScore?.toFixed(1) ?? "—" };
    case "yield":
      return {
        label: "연환산 분배율",
        value: etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—",
      };
    case "safety":
      return {
        label: "배당 안정성",
        value: etf.dividendStabilityScore != null ? etf.dividendStabilityScore.toFixed(1) : "—",
      };
    case "growth":
      return {
        label: "직전 대비 증감",
        value:
          etf.dividendTrendPct != null
            ? `${etf.dividendTrendPct > 0 ? "+" : ""}${etf.dividendTrendPct.toFixed(1)}%`
            : "—",
      };
  }
}

export function RankingTable({
  rankings,
}: {
  rankings: Record<Criterion, EtfSnapshot[]>;
}) {
  const [criterion, setCriterion] = useState<Criterion>("crady");
  const list = rankings[criterion];

  return (
    <div>
      <div className="flex gap-1 border border-[var(--gray-200)] rounded-lg p-1 w-fit overflow-x-auto max-w-full">
        {CRITERIA.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCriterion(c.key)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
              criterion === c.key
                ? "bg-black text-white font-semibold"
                : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-[var(--gray-500)] mt-3">
        {CRITERIA.find((c) => c.key === criterion)?.label} 기준 상위 {list.length}개 ETF
      </p>

      <div className="mt-3 border border-[var(--gray-200)] rounded-xl overflow-hidden xl:border-0 xl:rounded-none xl:overflow-visible xl:grid xl:grid-cols-2 xl:gap-3">
        {list.map((etf, i) => {
          const metric = metricFor(etf, criterion);
          return (
            <Link
              key={etf.ticker}
              href={`/${etf.ticker.toLowerCase()}`}
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
                      {RISK_LABEL[etf.riskLevel] ?? etf.riskLevel}
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
            해당 조건의 ETF가 아직 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
