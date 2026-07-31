// Reserved top-level paths that must never be treated as an ETF ticker.
// Checked defensively inside app/[ticker]/page.tsx even though Next.js's
// router already prefers static segments over the dynamic [ticker] route.
export const RESERVED_PATHS = new Set([
  "about",
  "ranking",
  "calendar",
  "distributions",
  "magazine",
  "privacy",
  "terms",
  "account-deletion",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "api",
  // The Korean locale prefix (app/ko/**) — Next.js's static-over-dynamic
  // route precedence already guarantees /ko never falls through to
  // [ticker], but this stays defensive-in-depth per this file's own
  // original rationale above.
  "ko",
]);
