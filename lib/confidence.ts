/** CRADY confidence-percentage formatting — the one place any raw
 * confidence value gets turned into a 0–100% display string.
 *
 * Audited every confidence_score column in the schema (2026-08): the
 * database genuinely stores this at two different scales depending on the
 * table — `next_predictions.confidence_score` is already 0–100 (e.g.
 * 83.78), while `dividend_predictions.confidence_score` (and
 * `activity_items.supporting_metrics.confidence`, written by the same
 * pipeline family) is 0–1 (e.g. 0.78). Several call sites had assumed the
 * 0–1 convention and multiplied by 100 regardless of source, which on a
 * value already at 0–100 produced impossible numbers like 8378%.
 *
 * Every caller must route through this function exactly once — never
 * multiply by 100 at the call site — so the source table's scale stops
 * mattering and a bad/unexpected value can never render out of range. */

export function normalizeConfidencePct(value: number): number {
  const pct = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, pct));
}

export function formatConfidencePct(value: number | null | undefined, digits = 1): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `${normalizeConfidencePct(value).toFixed(digits)}%`;
}
