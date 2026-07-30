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
          ];
        },
      }),
};

export default nextConfig;
