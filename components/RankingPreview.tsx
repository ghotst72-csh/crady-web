"use client";

import { useState } from "react";
import Link from "next/link";
import type { EtfSnapshot } from "@/lib/data";
import { EtfCard } from "@/components/etf/EtfCard";
import { snapshotToCardData } from "@/lib/etf/toCardData";

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
          <EtfCard key={etf.ticker} data={snapshotToCardData(etf)} compact lang={lang} />
        ))}
        {active.length === 0 && (
          <p className="text-sm text-[var(--gray-400)] col-span-3">{T.empty[lang]}</p>
        )}
      </div>
    </section>
  );
}
