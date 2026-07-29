import type { MetadataRoute } from "next";
import { getHomeSnapshot } from "@/lib/data";

export const dynamic = "force-static";

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
    { url: "https://crady.net/search", changeFrequency: "weekly", priority: 0.5 },
    { url: "https://crady.net/about", changeFrequency: "monthly", priority: 0.3 },
  ];

  const tickerEntries: MetadataRoute.Sitemap = snapshot.map((etf) => ({
    url: `https://crady.net/${etf.ticker.toLowerCase()}`,
    lastModified: etf.calculatedAt ? new Date(etf.calculatedAt) : undefined,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticEntries, ...tickerEntries];
}
