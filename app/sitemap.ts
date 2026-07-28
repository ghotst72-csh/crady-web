import type { MetadataRoute } from "next";
import { getAllTickers } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tickers = await getAllTickers();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: "https://crady.net/", changeFrequency: "daily", priority: 1 },
    { url: "https://crady.net/ranking", changeFrequency: "daily", priority: 0.8 },
    { url: "https://crady.net/calendar", changeFrequency: "daily", priority: 0.8 },
    { url: "https://crady.net/search", changeFrequency: "weekly", priority: 0.5 },
    { url: "https://crady.net/about", changeFrequency: "monthly", priority: 0.3 },
  ];

  const tickerEntries: MetadataRoute.Sitemap = tickers.map((t) => ({
    url: `https://crady.net/${t.ticker.toLowerCase()}`,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticEntries, ...tickerEntries];
}
