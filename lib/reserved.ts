// Reserved top-level paths that must never be treated as an ETF ticker.
// Checked defensively inside app/[ticker]/page.tsx even though Next.js's
// router already prefers static segments over the dynamic [ticker] route.
export const RESERVED_PATHS = new Set([
  "about",
  "ranking",
  "calendar",
  "magazine",
  "privacy",
  "terms",
  "account-deletion",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "api",
]);
