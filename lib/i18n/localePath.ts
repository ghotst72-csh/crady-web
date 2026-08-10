import { RESERVED_PATHS } from "@/lib/reserved";

// Pages that exist in both trees with an identical trailing segment —
// /about <-> /ko/about, /{ticker} <-> /ko/{ticker}, etc. Magazine, the
// external legal redirects (privacy/terms/account-deletion), the data/usage
// terms page, and the covered-call Learn landing page exist ONLY under
// (en) — there is no /ko equivalent (see the International SEO report) —
// so switching language from one of those pages has no exact target and
// falls back to the target language's home page instead of a broken link.
//
// PRODUCTION INCIDENT (2026-08-10): "what-is-a-covered-call-etf" was
// missing from this set. Without an entry here, getLocaleTargetPath fell
// through to the final `/ko/${segments}` mirror-path branch below and
// returned "/ko/what-is-a-covered-call-etf" — a URL with no matching
// static route, which Next.js's router then matched against the
// app/ko/[ticker] catch-all, treated as an unknown ticker, and 404'd via
// app/ko/not-found.tsx (the Korean "요청하신 페이지 또는 ETF를 찾을 수
// 없습니다" page). LanguagePreferenceManager's auto-redirect effect (fired
// only for a visitor with an explicit stored "ko" preference from a prior
// visit — never on a fresh visit, which is why this reproduced on a phone
// that had previously chosen Korean but not on a clean desktop browser)
// sent real mobile visitors straight into that dead path. Every route
// added under app/(en) with no app/ko counterpart must be listed here.
const NO_KO_EQUIVALENT = new Set([
  "magazine",
  "privacy",
  "terms",
  "account-deletion",
  "data-terms",
  "what-is-a-covered-call-etf",
]);

/** Given the CURRENT pathname (as returned by usePathname(), always
 * starting with "/") and the language being switched TO, returns the path
 * that preserves the current page in that language — or the target
 * language's home page when no direct equivalent exists. Pure and
 * SSR-safe (no window/localStorage access), so it's independently
 * testable and reusable by the header switcher, the mobile menu, the
 * footer link, and the first-visit recommendation card without four
 * separate implementations drifting apart. */
export function getLocaleTargetPath(pathname: string, targetLang: "en" | "ko"): string {
  const segments = pathname.split("/").filter(Boolean);

  if (targetLang === "ko") {
    if (segments.length === 0) return "/ko";
    const [first, ...rest] = segments;
    if (first === "ko") return pathname; // already Korean
    if (NO_KO_EQUIVALENT.has(first)) return "/ko";
    // "about" | "ranking" | "calendar" | "distributions" (incl. its
    // /distributions/{slug} archive sub-paths) | a ticker symbol — all mirror
    // 1:1 as /ko/{same segments}. RESERVED_PATHS also contains entries
    // (magazine, privacy, ...) already excluded above, plus "ko" itself
    // and infra paths (sitemap.xml, robots.txt, api) that should never
    // realistically be the current pathname here, but are excluded for
    // defense-in-depth rather than assumed impossible.
    if (RESERVED_PATHS.has(first) && !["about", "ranking", "calendar", "distributions"].includes(first)) {
      return "/ko";
    }
    return `/ko/${[first, ...rest].join("/")}`;
  }

  // targetLang === "en"
  if (segments.length === 0) return "/";
  if (segments[0] !== "ko") return pathname; // already English
  const rest = segments.slice(1);
  return rest.length === 0 ? "/" : `/${rest.join("/")}`;
}

const KOREAN_LANGUAGE_PREFIXES = ["ko"]; // matches ko, ko-KR, ko-KP, ko-*

/** True for "ko", "ko-KR", "ko-KP", and any other ko-* BCP 47 tag —
 * intentionally broad on the region subtag (Part 3 explicitly calls out
 * ko-KR and ko-KP by name, and there's no reason to special-case just
 * those two over e.g. a browser reporting plain "ko"). */
export function isKoreanLanguageTag(tag: string): boolean {
  const primary = tag.toLowerCase().split("-")[0];
  return KOREAN_LANGUAGE_PREFIXES.includes(primary);
}

/** Checks navigator.languages first (the user's full ranked preference
 * list), falling back to navigator.language — matches Part 3's explicit
 * priority order. Returns false in any environment without `navigator`
 * (SSR) rather than throwing. */
export function browserPrefersKorean(nav: Pick<Navigator, "languages" | "language"> | undefined): boolean {
  if (!nav) return false;
  const tags = (nav.languages && nav.languages.length > 0 ? nav.languages : [nav.language]).filter(
    Boolean
  );
  return tags.some((t) => isKoreanLanguageTag(t));
}
