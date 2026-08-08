import type { OfficialDistributionForTicker, PredictionVsOfficial } from "@/lib/distributions/data";

const T = {
  heading: { en: "Latest Official Distribution", ko: "최신 공식 분배금" },
  officialBadge: { en: "Official", ko: "공식" },
  perShare: { en: "Distribution per Share", ko: "주당 분배금" },
  announced: { en: "Announced", ko: "발표일" },
  exDate: { en: "Ex-Date", ko: "배당락일" },
  payDate: { en: "Payment Date", ko: "지급일" },
  rate: { en: "Distribution Rate", ko: "분배율" },
  secYield: { en: "30-Day SEC Yield", ko: "30일 SEC 수익률" },
  roc: { en: "ROC", ko: "ROC" },
  source: { en: "Official source →", ko: "공식 출처 →" },
  updated: { en: "Updated", ko: "업데이트" },
  na: "—",
  // Prediction-vs-official comparison
  compareHeading: { en: "CRADY Prediction vs. Official", ko: "CRADY 예측 vs. 공식 분배금" },
  predicted: { en: "CRADY Prediction", ko: "CRADY 예측" },
  official: { en: "Official Distribution", ko: "공식 분배금" },
  absDiff: { en: "Absolute Difference", ko: "절대 차이" },
  pctError: { en: "Percentage Error", ko: "오차율" },
  predictedBadge: { en: "Predicted", ko: "예측" },
} as const;

function fmtMoney(n: number | null | undefined): string {
  return n != null ? `$${n.toFixed(4)}` : T.na;
}
function fmtPct(n: number | null | undefined): string {
  return n != null ? `${n.toFixed(2)}%` : T.na;
}

export function OfficialDistributionBlock({
  official,
  predictionComparison,
  lang = "en",
}: {
  official: OfficialDistributionForTicker | null;
  predictionComparison: PredictionVsOfficial | null;
  lang?: "en" | "ko";
}) {
  if (!official) return null;

  return (
    <div className="border border-[var(--gray-200)] rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
        <span className="px-2 py-0.5 rounded-full bg-[var(--crady-accent)]/15 text-[#92400e] text-[11px] font-semibold">
          {T.officialBadge[lang]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-[var(--gray-500)]">{T.perShare[lang]}</div>
          <div className="font-bold text-lg">{fmtMoney(official.amount)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--gray-500)]">{T.rate[lang]}</div>
          <div className="font-semibold">{fmtPct(official.distributionRate)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--gray-500)]">{T.secYield[lang]}</div>
          <div className="font-semibold">{fmtPct(official.secYield30d)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--gray-500)]">{T.roc[lang]}</div>
          <div className="font-semibold">{fmtPct(official.rocPercent)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--gray-500)]">{T.exDate[lang]}</div>
          <div>{official.exDate}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--gray-500)]">{T.payDate[lang]}</div>
          <div>{official.payDate}</div>
        </div>
        {official.announcementDate && (
          <div>
            <div className="text-xs text-[var(--gray-500)]">{T.announced[lang]}</div>
            <div>{official.announcementDate}</div>
          </div>
        )}
      </div>

      {(official.announcementSourceUrl || official.sourceUrl) && (
        <a
          href={official.announcementSourceUrl ?? official.sourceUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 inline-block text-sm font-medium text-[#92400e] hover:underline"
        >
          {T.source[lang]}
        </a>
      )}

      {predictionComparison && (
        <div className="mt-5 pt-4 border-t border-[var(--gray-100)]">
          <h3 className="text-sm font-bold">{T.compareHeading[lang]}</h3>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                {T.predicted[lang]}
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-500)] text-[10px]">
                  {T.predictedBadge[lang]}
                </span>
              </div>
              <div className="font-semibold">{fmtMoney(predictionComparison.predictedAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--gray-500)] flex items-center gap-1">
                {T.official[lang]}
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--crady-accent)]/15 text-[#92400e] text-[10px]">
                  {T.officialBadge[lang]}
                </span>
              </div>
              <div className="font-semibold">{fmtMoney(predictionComparison.actualAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--gray-500)]">{T.absDiff[lang]}</div>
              <div className="font-semibold">{fmtMoney(predictionComparison.absoluteDifference)}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--gray-500)]">{T.pctError[lang]}</div>
              <div className="font-semibold">
                {predictionComparison.percentageError != null
                  ? `${predictionComparison.percentageError.toFixed(1)}%`
                  : T.na}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
