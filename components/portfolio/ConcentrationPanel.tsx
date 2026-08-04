import type { PortfolioAnalysis } from "@/lib/portfolio/analyze";

const T = {
  title: { en: "Concentration Analysis", ko: "집중도 분석" },
  byProvider: { en: "By Provider", ko: "운용사별" },
  byUnderlying: { en: "By Underlying Asset", ko: "기초자산별" },
  byStrategy: { en: "By Strategy", ko: "전략별" },
  topHolding: { en: "Largest Position", ko: "최대 비중 종목" },
  noData: { en: "Not enough real data to compute concentration yet.", ko: "집중도를 계산할 만큼 데이터가 충분하지 않습니다." },
} as const;

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-[var(--gray-600)] truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--gray-100)] overflow-hidden">
        <div className="h-full bg-[var(--gray-700)]" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">{pct.toFixed(0)}%</span>
    </div>
  );
}

export function ConcentrationPanel({
  concentration,
  lang = "en",
}: {
  concentration: PortfolioAnalysis["concentration"];
  lang?: "en" | "ko";
}) {
  if (!concentration) {
    return (
      <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
        <div className="text-caption">{T.title[lang]}</div>
        <p className="mt-2 text-sm text-[var(--gray-400)]">{T.noData[lang]}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
      <div className="text-caption">{T.title[lang]}</div>

      <div className="mt-3 space-y-4">
        <div>
          <div className="text-[11px] font-semibold text-[var(--gray-500)] mb-1.5">{T.byProvider[lang]}</div>
          <div className="space-y-1.5">
            {concentration.byProvider.map((p) => (
              <Bar key={p.label} label={p.label} pct={p.pct} />
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[var(--gray-500)] mb-1.5">{T.byUnderlying[lang]}</div>
          <div className="space-y-1.5">
            {concentration.byUnderlying.map((u) => (
              <Bar key={u.label} label={u.label} pct={u.pct} />
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[var(--gray-500)] mb-1.5">{T.byStrategy[lang]}</div>
          <div className="space-y-1.5">
            {concentration.byStrategy.map((s) => (
              <Bar key={s.label} label={s.label} pct={s.pct} />
            ))}
          </div>
        </div>
      </div>

      {concentration.topHolding && (
        <div className="mt-4 pt-3 border-t border-[var(--gray-200)] text-sm">
          <span className="text-[var(--gray-500)]">{T.topHolding[lang]}: </span>
          <span className="font-semibold">
            {concentration.topHolding.ticker} {concentration.topHolding.pct.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
