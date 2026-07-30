import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds a fully static `out/` directory for the GitHub
// Pages fallback deploy (no ISR, snapshot at build time). The normal build
// (used by Vercel) stays dynamic/ISR — see app/[ticker]/page.tsx revalidate.
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        basePath: "/crady-web",
        images: { unoptimized: true },
      }
    : {
        // redirects() isn't supported with output:"export", so it's only
        // wired up for the normal (Vercel) build.
        async redirects() {
          return [
            // /search was a real, indexed URL (Google Search Console) whose
            // role — finding an ETF by name — is now served by /magazine.
            // Query strings (e.g. ?q=...) are preserved and forwarded by
            // Next's redirect handling by default; the magazine index
            // ignores unknown params so that's harmless rather than a
            // second redirect.
            {
              source: "/search",
              destination: "/magazine",
              permanent: true,
            },
            // Magazine 2.0 keyword-variant aliases: these all describe the
            // exact same ranked-list content as an existing hub. Rather than
            // rendering a second near-identical page per synonym (a doorway-
            // page pattern), each variant 308s to the one real hub page —
            // consolidating ranking signal onto a single canonical URL while
            // still matching the search phrase.
            { source: "/magazine/highest-yield-etfs", destination: "/magazine/highest-dividend-etfs", permanent: true },
            { source: "/magazine/top-dividend-etfs-2026", destination: "/magazine/highest-dividend-etfs", permanent: true },
            { source: "/magazine/monthly-income-etfs", destination: "/magazine/monthly-dividend-etfs", permanent: true },
            { source: "/magazine/weekly-income-etfs", destination: "/magazine/weekly-dividend-etfs", permanent: true },
            { source: "/magazine/yieldmax-dividend-predictions", destination: "/magazine/yieldmax-etfs", permanent: true },
            { source: "/magazine/roundhill-dividend-predictions", destination: "/magazine/roundhill-etfs", permanent: true },
            { source: "/magazine/defiance-dividend-predictions", destination: "/magazine/defiance-etfs", permanent: true },
          ];
        },
      }),
};

export default nextConfig;
