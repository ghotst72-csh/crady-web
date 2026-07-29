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

type Tab = "crady" | "yield" | "increased";

const TABS: { key: Tab; label: string }[] = [
  { key: "crady", label: "CRADY 점수" },
  { key: "yield", label: "연환산 분배율" },
  { key: "increased", label: "배당 증가" },
];

export function RankingPreview({
  cradyTop,
  yieldTop,
  increasedTop,
}: {
  cradyTop: EtfSnapshot[];
  yieldTop: EtfSnapshot[];
  increasedTop: EtfSnapshot[];
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 border border-[var(--gray-200)] rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "bg-black text-white font-semibold"
                  : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link
          href="/ranking"
          className="text-sm text-[var(--gray-500)] hover:text-black"
        >
          전체 랭킹 보기 →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {active.map((etf) => (
          <RankPreviewCard key={etf.ticker} etf={etf} tab={tab} />
        ))}
        {active.length === 0 && (
          <p className="text-sm text-[var(--gray-400)] col-span-3">
            해당 조건의 ETF가 아직 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function RankPreviewCard({ etf, tab }: { etf: EtfSnapshot; tab: Tab }) {
  const metric =
    tab === "crady"
      ? { label: "CRADY 점수", value: etf.cradyScore?.toFixed(1) ?? "—" }
      : tab === "yield"
        ? {
            label: "연환산 분배율",
            value: etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—",
          }
        : {
            label: "직전 대비 증가율",
            value:
              etf.dividendTrendPct != null ? `+${etf.dividendTrendPct.toFixed(1)}%` : "—",
          };

  return (
    <Link
      href={`/${etf.ticker.toLowerCase()}`}
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
            {RISK_LABEL[etf.riskLevel] ?? etf.riskLevel}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-xs text-[var(--gray-500)]">{metric.label}</div>
        <div className="text-xl font-extrabold text-[var(--crady-accent)]">
          {metric.value}
        </div>
      </div>
      <div className="mt-2 text-xs text-[var(--gray-500)]">
        현재가 {etf.price != null ? `$${etf.price.toFixed(2)}` : "—"}
      </div>
    </Link>
  );
}
