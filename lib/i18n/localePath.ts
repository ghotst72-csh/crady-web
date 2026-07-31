import { RESERVED_PATHS } from "@/lib/reserved";

// Pages that exist in both trees with an identical trailing segment —
// /about <-> /ko/about, /{ticker} <-> /ko/{ticker}, etc. Magazine and the
// external legal redirects (privacy/terms/account-deletion) exist ONLY
// under (en) — there is no /ko equivalent (see the International SEO
// report) — so switching language from one of those pages has no exact
// target and falls back to the target language's home page instead of a
// broken link.
const NO_KO_EQUIVALENT = new Set(["magazine", "privacy", "terms", "account-deletion"]);

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
    // "about" | "ranking" | "calendar" | a ticker symbol — all mirror
    // 1:1 as /ko/{same segments}. RESERVED_PATHS also contains entries
    // (magazine, privacy, ...) already excluded above, plus "ko" itself
    // and infra paths (sitemap.xml, robots.txt, api) that should never
    // realistically be the current pathname here, but are excluded for
    // defense-in-depth rather than assumed impossible.
    if (RESERVED_PATHS.has(first) && !["about", "ranking", "calendar"].includes(first)) {
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
