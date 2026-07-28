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
    : {}),
};

export default nextConfig;
