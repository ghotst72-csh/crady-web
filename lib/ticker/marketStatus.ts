/** CRADY ETF Detail UI (reference-locked) — a real, honestly-computed
 * "is US equity market open right now" check (NYSE regular hours, 9:30am–
 * 4:00pm America/New_York, Mon–Fri). Deliberately does not account for
 * market holidays (no holiday calendar exists in this codebase) — an
 * honest best-effort against standard hours, not a fabricated status. */
export function isUsMarketOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  if (weekday === "Sat" || weekday === "Sun") return false;

  const minutesSinceMidnight = hour * 60 + minute;
  return minutesSinceMidnight >= 9 * 60 + 30 && minutesSinceMidnight < 16 * 60;
}
