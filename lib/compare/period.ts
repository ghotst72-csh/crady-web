export type ComparePeriodPreset = "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y";

export type ComparePeriodInput =
  | { preset: ComparePeriodPreset }
  | { preset: "custom"; customStart: string; customEnd: string };

export type ResolvedComparePeriod = { startDate: string; endDate: string };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Pure — `todayIso` is always passed in, never read from `new Date()`
 * internally, so this is deterministically testable and matches this
 * codebase's existing convention (see computePriceStatus). `endDate`
 * defaults to `todayIso` for every non-custom preset; each ticker's own
 * resolvePurchasePrice snaps independently to its nearest at-or-before
 * trading day from there — the same tolerant weekend/holiday handling
 * already used everywhere else in this codebase, applied identically to
 * every compared ticker (not a fairness violation: every ticker gets the
 * exact same requested endpoint, just resolved against its own real
 * calendar of trading days).
 *
 * `startDate` is deliberately NEVER clamped to an individual ticker's
 * inception date here (unlike the ETF Calculator's Quick Examples, which
 * does clamp for single-ETF convenience) — an ETF that can't cover the
 * full requested window must surface as "insufficient history" via
 * computePeriodReturn instead of silently being compared over a shorter,
 * different period than its peers. */
export function resolveComparePeriod(
  input: ComparePeriodInput,
  todayIso: string
): ResolvedComparePeriod | null {
  if (input.preset === "custom") {
    const { customStart, customEnd } = input;
    if (!ISO_DATE_RE.test(customStart) || !ISO_DATE_RE.test(customEnd)) return null;
    if (customEnd < customStart) return null;
    if (customEnd > todayIso) return null;
    return { startDate: customStart, endDate: customEnd };
  }

  const end = new Date(`${todayIso}T00:00:00Z`);
  const start = new Date(end);

  switch (input.preset) {
    case "1M":
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    case "3M":
      start.setUTCMonth(start.getUTCMonth() - 3);
      break;
    case "6M":
      start.setUTCMonth(start.getUTCMonth() - 6);
      break;
    case "YTD":
      start.setUTCMonth(0, 1); // January 1st of the endpoint's own year
      break;
    case "1Y":
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      break;
    case "3Y":
      start.setUTCFullYear(start.getUTCFullYear() - 3);
      break;
    case "5Y":
      start.setUTCFullYear(start.getUTCFullYear() - 5);
      break;
    default:
      return null;
  }

  return { startDate: start.toISOString().slice(0, 10), endDate: todayIso };
}

export type SuggestedPeriod =
  | { kind: "preset"; preset: ComparePeriodPreset }
  | { kind: "custom"; customStart: string; customEnd: string };

/** Given the maximum common available history across the currently
 * selected ETFs, finds the longest standard preset that fits entirely
 * within it — purely advisory (see CommonHistoryNotice.tsx), never
 * applied automatically. Falls back to a custom range spanning the exact
 * available window if not even 1M fits. Returns null only when there's
 * no usable window at all (commonEarliestDate is today or later). */
export function findClosestAvailablePreset(
  commonEarliestDate: string,
  todayIso: string
): SuggestedPeriod | null {
  const ALL_PRESETS: ComparePeriodPreset[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"];
  let best: { preset: ComparePeriodPreset; startDate: string } | null = null;

  for (const preset of ALL_PRESETS) {
    const resolved = resolveComparePeriod({ preset }, todayIso);
    if (!resolved || resolved.startDate < commonEarliestDate) continue;
    if (!best || resolved.startDate < best.startDate) {
      best = { preset, startDate: resolved.startDate };
    }
  }

  if (best) return { kind: "preset", preset: best.preset };
  if (commonEarliestDate < todayIso) {
    return { kind: "custom", customStart: commonEarliestDate, customEnd: todayIso };
  }
  return null;
}

/** "~3Y", "~8M" — a short, human duration label for the common-history
 * notice. Deliberately coarse (years once >= 1 year, otherwise months) —
 * this is a rough orientation figure, not a precise metric. */
export function approximateDurationLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const totalMonths =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  if (totalMonths >= 12) {
    const years = Math.round((totalMonths / 12) * 10) / 10;
    return `~${years}Y`;
  }
  return `~${Math.max(1, totalMonths)}M`;
}
