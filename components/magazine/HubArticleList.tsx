import { getHomeSnapshot, providerLabel } from "@/lib/data";
import { HUB_DEFINITIONS, type HubId } from "@/lib/magazine/hubs";
import { articleSlug } from "@/lib/magazine/recipes";
import { ArticleCard } from "./ArticleCard";
import { ArticleTypeBadge } from "./ArticleTypeBadge";

export async function HubArticleList({ hubSlug }: { hubSlug: HubId }) {
  const def = HUB_DEFINITIONS[hubSlug];
  const snapshot = await getHomeSnapshot();
  const items = snapshot.filter(def.filter).sort(def.sort).slice(0, 50);

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--gray-400)]">
        No ETFs currently match this category.
      </p>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((etf) => (
        <ArticleCard
          key={etf.ticker}
          href={`/magazine/${articleSlug(etf.ticker, "next-dividend-prediction")}`}
          ticker={etf.ticker}
          badge={<ArticleTypeBadge type="next-dividend-prediction" />}
          subtitle={providerLabel(etf.provider_id)}
          metricValue={etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : undefined}
          metricLabel="Est. Annual Yield"
          summary={etf.cradyScore != null ? `CRADY Score ${etf.cradyScore.toFixed(1)}` : undefined}
        />
      ))}
    </div>
  );
}
