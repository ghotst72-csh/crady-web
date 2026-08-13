import type { PeriodReturnResult } from "./calculations";
import type { EtfSnapshot } from "@/lib/data";

/** A period return result merged with the ticker's sitewide snapshot
 * (CRADY Score, provider, name, trailing distribution yield, Dividend
 * Stability Score) — the shape both the main comparison grid and the
 * discovery scan work with. `snapshot` is null only if a ticker somehow
 * has price/distribution data but no `etfs`/`etf_risk_metrics` row,
 * which shouldn't happen for anything in getHomeSnapshot()'s own list. */
export type CompareEntry = PeriodReturnResult & { snapshot: EtfSnapshot | null };
