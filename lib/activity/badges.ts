import type { ActivitySource } from "./types";
import type { BadgeVariant } from "@/components/ui/Badge";

export type ActivityBadgeKind = "official" | "market" | "crady" | "ai" | "investor" | "moderator";

const BADGE_VARIANT: Record<ActivityBadgeKind, BadgeVariant> = {
  official: "blue",
  market: "green",
  crady: "accent",
  ai: "violet",
  investor: "neutral",
  moderator: "red",
};

export function activityBadgeVariant(source: ActivitySource): BadgeVariant {
  return BADGE_VARIANT[getActivityBadgeKind(source)];
}

const BADGE_LABEL: Record<ActivityBadgeKind, { en: string; ko: string }> = {
  official: { en: "Official", ko: "공식" },
  market: { en: "Market Data", ko: "시장 데이터" },
  crady: { en: "CRADY Analysis", ko: "CRADY 분석" },
  ai: { en: "CRADY Analysis", ko: "CRADY 분석" },
  investor: { en: "Investor", ko: "투자자" },
  moderator: { en: "Moderator", ko: "운영자" },
};

/** Maps a row's `source` straight to its badge — kept as a single, explicit
 * table (not inferred from `type` prefixes) specifically so "Official" and
 * "CRADY Analysis" can never be confused with each other, per the product
 * requirement. `ai` and `crady` intentionally share the "CRADY Analysis"
 * label: both are CRADY's own computed content, just two different existing
 * source values (ai = the Outlook narrative, crady = metric changes). */
export function getActivityBadgeKind(source: ActivitySource): ActivityBadgeKind {
  switch (source) {
    case "official":
      return "official";
    case "market":
      return "market";
    case "crady":
      return "crady";
    case "ai":
      return "ai";
    case "moderator":
      return "moderator";
    case "investor":
    default:
      return "investor";
  }
}

export function activityBadgeLabel(source: ActivitySource, lang: "en" | "ko" = "en"): string {
  return BADGE_LABEL[getActivityBadgeKind(source)][lang];
}
