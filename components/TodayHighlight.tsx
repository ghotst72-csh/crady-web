import Link from "next/link";
import { providerLabel, type EtfSnapshot, type Highlight } from "@/lib/data";

const RISK_LABEL: Record<string, string> = {
  SAFE: "안정",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "고위험",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function TodayHighlight({
  highlight,
  yieldLeader,
  cradyLeader,
}: {
  highlight: Highlight;
  yieldLeader: EtfSnapshot | null;
  cradyLeader: EtfSnapshot | null;
}) {
  const dDay = daysUntil(highlight.nextPredictedDate);
  const hasNext = highlight.nextPredictedAmount != null || dDay != null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
      <h1 className="text-sm font-semibold text-[var(--gray-500)] mb-3">
        오늘 주목할 ETF
      </h1>

      <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
        {/* Main highlight card — the ONE big card on the page */}
        <div className="border border-[var(--gray-200)] rounded-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold">
                  {highlight.ticker}
                </span>
                {highlight.riskLevel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                    {RISK_LABEL[highlight.riskLevel] ?? highlight.riskLevel}
                  </span>
                )}
              </div>
              <div className="text-sm text-[var(--gray-500)] mt-1">
                {providerLabel(highlight.provider_id)}
                {highlight.name ? ` · ${highlight.name}` : ""}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label="연환산 분배율"
              value={
                highlight.annualYieldPct != null
                  ? `${highlight.annualYieldPct.toFixed(1)}%`
                  : "—"
              }
              accent
            />
            <Stat
              label="CRADY 점수"
              value={
                highlight.cradyScore != null ? highlight.cradyScore.toFixed(1) : "—"
              }
            />
            <Stat
              label="최근 배당금"
              value={
                highlight.latestDividend != null
                  ? `$${highlight.latestDividend.toFixed(4)}`
                  : "예측 대기"
              }
            />
            <Stat
              label={dDay != null ? "다음 배당까지" : "다음 예상 배당"}
              value={
                dDay != null
                  ? dDay <= 0
                    ? "지급 예정"
                    : `D-${dDay}`
                  : highlight.nextPredictedAmount != null
                    ? `$${highlight.nextPredictedAmount.toFixed(4)}`
                    : "예측 대기"
              }
              accent={hasNext}
            />
          </div>

          <Link
            href={`/${highlight.ticker.toLowerCase()}`}
            className="mt-6 inline-flex items-center justify-center px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors"
          >
            ETF 상세 보기 →
          </Link>
        </div>

        {/* Two small supporting callouts — not full cards */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
          {yieldLeader && (
            <MiniStat
              label="연환산 분배율 1위"
              ticker={yieldLeader.ticker}
              value={
                yieldLeader.annualYieldPct != null
                  ? `${yieldLeader.annualYieldPct.toFixed(1)}%`
                  : "—"
              }
            />
          )}
          {cradyLeader && (
            <MiniStat
              label="CRADY 점수 1위"
              ticker={cradyLeader.ticker}
              value={
                cradyLeader.cradyScore != null
                  ? cradyLeader.cradyScore.toFixed(1)
                  : "—"
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-[var(--gray-500)]">{label}</div>
      <div
        className={`text-xl font-bold mt-0.5 ${accent ? "text-[var(--crady-accent)]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  ticker,
  value,
}: {
  label: string;
  ticker: string;
  value: string;
}) {
  return (
    <Link
      href={`/${ticker.toLowerCase()}`}
      className="border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors flex flex-col"
    >
      <div className="text-xs text-[var(--gray-500)] whitespace-nowrap">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="font-bold">{ticker}</span>
        <span className="text-[var(--crady-accent)] font-bold text-sm">
          {value}
        </span>
      </div>
    </Link>
  );
}
