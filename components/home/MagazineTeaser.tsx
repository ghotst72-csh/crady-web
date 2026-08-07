import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";
import { articleSlug } from "@/lib/magazine/recipes";
import { ArticleCard } from "@/components/magazine/ArticleCard";
import { ArticleTypeBadge } from "@/components/magazine/ArticleTypeBadge";

const RISK_LABEL: Record<string, string> = { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" };

const T = {
  heading: { en: "Latest Research", ko: "최신 리서치" },
  sub: {
    en: "One featured deep dive, plus what's paying soonest — from the CRADY Magazine.",
    ko: "심층 분석 1건과 곧 지급 예정인 ETF — CRADY 매거진에서.",
  },
  viewAll: { en: "View the full Magazine →", ko: "매거진 전체 보기 →" },
} as const;

/** The Magazine itself is English-only (no /ko/magazine route exists —
 * same constraint the site nav already accepts, linking "/magazine" from
 * the Korean header as-is). This teaser localizes its own heading/sub/CTA
 * chrome to Korean but embeds the same English article content the nav
 * already links out to. Satisfies both "Latest Research" and "Magazine" in
 * the homepage flow with one section rather than two overlapping ones — a
 * featured deep dive plus three secondary stories, exactly Part 11's spec,
 * reusing the same ArticleCard the Magazine hub uses for a consistent look. */
export function MagazineTeaser({ snapshot, lang = "en" }: { snapshot: EtfSnapshot[]; lang?: "en" | "ko" }) {
  const byYield = [...snapshot]
    .filter((e) => e.annualYieldPct != null)
    .sort((a, b) => b.annualYieldPct! - a.annualYieldPct!);
  const byUpcoming = [...snapshot]
    .filter((e) => e.nextPredictedDate != null)
    .sort((a, b) => (a.nextPredictedDate! < b.nextPredictedDate! ? -1 : 1));

  const featured = byYield[0];
  if (!featured) return null;
  const secondary = byUpcoming.filter((e) => e.ticker !== featured.ticker).slice(0, 3);

  const extraStats = [
    featured.riskLevel ? { label: "Risk Level", value: RISK_LABEL[featured.riskLevel] ?? featured.riskLevel } : null,
    featured.payoutFrequency ? { label: "Frequency", value: featured.payoutFrequency } : null,
    featured.nextPredictedDate ? { label: "Next Predicted Payment", value: featured.nextPredictedDate } : null,
  ].filter((s): s is { label: string; value: string } => s != null);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
        <Link href="/magazine" className="text-sm text-[var(--gray-500)] hover:text-black shrink-0">
          {T.viewAll[lang]}
        </Link>
      </div>
      <p className="text-xs text-[var(--gray-500)] mb-4">{T.sub[lang]}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <ArticleCard
            href={`/magazine/${articleSlug(featured.ticker, "next-dividend-prediction")}`}
            ticker={featured.ticker}
            badge={<ArticleTypeBadge type="next-dividend-prediction" lang={lang} />}
            subtitle={`${providerLabel(featured.provider_id)} · Next Dividend Prediction`}
            metricValue={featured.annualYieldPct != null ? `${featured.annualYieldPct.toFixed(1)}%` : undefined}
            metricLabel="Est. Annual Yield"
            summary={featured.cradyScore != null ? `CRADY Score ${featured.cradyScore.toFixed(1)}` : undefined}
            extraStats={extraStats}
            cta={`Read the full ${featured.ticker} forecast →`}
            featured
          />
        </div>
        {secondary.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
            {secondary.map((etf) => (
              <ArticleCard
                key={etf.ticker}
                href={`/magazine/${articleSlug(etf.ticker, "next-dividend-prediction")}`}
                ticker={etf.ticker}
                badge={<ArticleTypeBadge type="next-dividend-prediction" lang={lang} />}
                subtitle={`${providerLabel(etf.provider_id)} · Next Dividend Prediction`}
                metricValue={etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : undefined}
                metricLabel="Est. Annual Yield"
                summary={etf.cradyScore != null ? `CRADY Score ${etf.cradyScore.toFixed(1)}` : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
