import type { MetadataRoute } from "next";
import { getHomeSnapshot } from "@/lib/data";
import { ARTICLE_TYPE_SLUG } from "@/lib/magazine/recipes";
import { HUB_IDS } from "@/lib/magazine/hubs";
import type { ArticleTypeId } from "@/lib/magazine/types";

export const dynamic = "force-static";

const ARTICLE_TYPES = Object.keys(ARTICLE_TYPE_SLUG) as ArticleTypeId[];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const snapshot = await getHomeSnapshot();

  // Most recent pipeline run across all tickers — a real, verifiable
  // "when was this site's data last refreshed" signal for the aggregate
  // pages (home/ranking/calendar), instead of an arbitrary build timestamp.
  const mostRecentCalculatedAt = snapshot.reduce<Date | null>((latest, r) => {
    if (!r.calculatedAt) return latest;
    const d = new Date(r.calculatedAt);
    return !latest || d > latest ? d : latest;
  }, null);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: "https://crady.net",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://crady.net/ranking",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://crady.net/calendar",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://crady.net/magazine",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: "https://crady.net/about", changeFrequency: "monthly", priority: 0.3 },
  ];

  const tickerEntries: MetadataRoute.Sitemap = snapshot.map((etf) => ({
    url: `https://crady.net/${etf.ticker.toLowerCase()}`,
    lastModified: etf.calculatedAt ? new Date(etf.calculatedAt) : undefined,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const hubEntries: MetadataRoute.Sitemap = HUB_IDS.map((slug) => ({
    url: `https://crady.net/magazine/${slug}`,
    lastModified: mostRecentCalculatedAt ?? undefined,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const magazineEntries: MetadataRoute.Sitemap = snapshot.flatMap((etf) =>
    ARTICLE_TYPES.map((type) => ({
      url: `https://crady.net/magazine/${etf.ticker.toLowerCase()}-${ARTICLE_TYPE_SLUG[type]}`,
      lastModified: etf.calculatedAt ? new Date(etf.calculatedAt) : undefined,
      changeFrequency: "daily" as const,
      priority: type === "next-dividend-prediction" ? 0.85 : 0.7,
    }))
  );

  return [...staticEntries, ...tickerEntries, ...hubEntries, ...magazineEntries];
}
