const T = {
  heading: { en: "Community Dividend Prediction", ko: "커뮤니티 배당 예측" },
  cradyPrediction: { en: "CRADY Prediction", ko: "CRADY 예측" },
  communityConsensus: { en: "Community Consensus", ko: "커뮤니티 컨센서스" },
  notEnough: { en: "Not enough community predictions yet.", ko: "아직 커뮤니티 예측이 충분하지 않습니다." },
  na: "—",
} as const;

/** CRADY Phase 3 §7 — architecture placeholder for the future "what do
 * investors think the next dividend will be" feature. No voting
 * infrastructure exists yet, so this deliberately never fabricates a
 * community number — it always shows the real CRADY prediction alongside
 * an honest "not enough data" state, exactly per spec, with no seed data. */
export function CommunityPredictionConsensus({
  cradyPrediction,
  lang = "en",
}: {
  cradyPrediction: { amount: number | null; isOfficial: boolean } | null;
  lang?: "en" | "ko";
}) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4">
      <h3 className="text-sm font-bold">{T.heading[lang]}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] text-[var(--gray-500)]">{T.cradyPrediction[lang]}</div>
          <div className="mt-1 text-lg font-extrabold tabular-nums text-[var(--crady-accent)]">
            {cradyPrediction?.amount != null ? `$${cradyPrediction.amount.toFixed(4)}` : T.na}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--gray-500)]">{T.communityConsensus[lang]}</div>
          <div className="mt-1 text-sm text-[var(--gray-400)]">{T.notEnough[lang]}</div>
        </div>
      </div>
    </div>
  );
}
