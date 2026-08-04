import { Badge } from "@/components/ui/Badge";
import type { PriceDataStatus } from "@/lib/portfolio/types";

const T: Record<PriceDataStatus, Record<"en" | "ko", string>> = {
  current: { en: "Current", ko: "최신" },
  delayed: { en: "Delayed", ko: "지연" },
  incomplete: { en: "Incomplete", ko: "불완전" },
  estimated: { en: "Estimated", ko: "추정" },
  unavailable: { en: "Unavailable", ko: "데이터 없음" },
};

/** §13's five-state data-trust vocabulary, rendered consistently wherever
 * a KPI depends on data that might be stale or missing — never silently
 * shown as if it were normal, current data. */
export function DataStatusBadge({
  status,
  lang = "en",
  staleDays,
}: {
  status: PriceDataStatus;
  lang?: "en" | "ko";
  staleDays?: number | null;
}) {
  const variant = status === "current" ? "green" : status === "unavailable" ? "red" : "accent";
  const label = staleDays != null && status === "delayed"
    ? lang === "ko"
      ? `${T[status][lang]} · ${staleDays}일 전`
      : `${T[status][lang]} · ${staleDays}d old`
    : T[status][lang];
  return <Badge variant={variant}>{label}</Badge>;
}
