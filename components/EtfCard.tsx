import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  return diff;
}

const RISK_LABEL: Record<string, string> = {
  SAFE: "안정",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "고위험",
};

export function EtfCard({ etf }: { etf: EtfSnapshot }) {
  const dDay = daysUntil(etf.nextPredictedDate);

  return (
    <Link
      href={`/${etf.ticker.toLowerCase()}`}
      className="shrink-0 w-[248px] sm:w-auto border border-[var(--gray-200)] rounded-xl p-4 bg-white hover:border-black transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-lg leading-tight">{etf.ticker}</div>
          <div className="text-xs text-[var(--gray-500)] truncate">
            {providerLabel(etf.provider_id)}
            {etf.name ? ` · ${etf.name}` : ""}
          </div>
        </div>
        {etf.riskLevel && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
            {RISK_LABEL[etf.riskLevel] ?? etf.riskLevel}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold text-[var(--crady-accent)]">
          {etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—"}
        </span>
        <span className="text-xs text-[var(--gray-500)]">연환산</span>
        {etf.dividendTrend === "up" && (
          <span className="text-xs font-semibold text-green-600">▲</span>
        )}
        {etf.dividendTrend === "down" && (
          <span className="text-xs font-semibold text-red-500">▼</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
        <div>
          <div className="text-[var(--gray-400)]">현재가</div>
          <div className="font-semibold">
            {etf.price != null ? `$${etf.price.toFixed(2)}` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[var(--gray-400)]">CRADY 점수</div>
          <div className="font-semibold">
            {etf.cradyScore != null ? etf.cradyScore.toFixed(1) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[var(--gray-400)]">최근 배당</div>
          <div className="font-semibold">
            {etf.latestDividend != null ? `$${etf.latestDividend.toFixed(4)}` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[var(--gray-400)]">다음 예상</div>
          <div className="font-semibold">
            {etf.nextPredictedAmount != null
              ? `$${etf.nextPredictedAmount.toFixed(4)}`
              : "—"}
          </div>
        </div>
      </div>

      {dDay != null && (
        <div className="mt-3 pt-3 border-t border-[var(--gray-100)] text-xs flex items-center justify-between">
          <span className="text-[var(--gray-500)]">예상 지급일</span>
          <span className="font-bold text-[var(--crady-accent)]">
            {dDay <= 0 ? "지급 예정" : `D-${dDay}`}
          </span>
        </div>
      )}
    </Link>
  );
}
