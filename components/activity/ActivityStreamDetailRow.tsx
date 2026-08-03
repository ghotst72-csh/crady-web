import { Badge } from "@/components/ui/Badge";
import type { ActivityStreamEntry } from "@/lib/activity/types";
import { activityBadgeLabel, activityBadgeVariant } from "@/lib/activity/badges";
import { calculationMethodLabel, formatSupportingMetrics } from "@/lib/activity/detailCopy";

const T = {
  occurredAt: { en: "Occurred", ko: "발생 시각" },
  method: { en: "How this is calculated", ko: "계산 방법" },
  viewSource: { en: "View source", ko: "출처 보기" },
} as const;

function formatFullTimestamp(iso: string, lang: "en" | "ko"): string {
  const d = new Date(iso);
  return d.toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimestamp(iso: string, lang: "en" | "ko"): string {
  const hasTime = iso.includes("T");
  if (!hasTime) return iso;
  const d = new Date(iso);
  return d.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

/** One Official/Market/CRADY Analysis stream row, expandable via a native
 * `<details>` disclosure — zero client JS, works without JavaScript,
 * keyboard/screen-reader accessible for free. Expanded content is the
 * transparency requirement from the product spec: full occurred time, the
 * real supporting numbers (never re-derived or rounded differently than
 * what's stored), how the number was calculated, and a link to the source
 * or the ETF's own page — with the Official/CRADY Analysis badge carried
 * through unchanged so the two are never confused. */
export function ActivityStreamDetailRow({ entry, lang }: { entry: ActivityStreamEntry; lang: "en" | "ko" }) {
  const detail = entry.detail!;
  const metrics = formatSupportingMetrics(detail.supportingMetrics, lang);
  const method = calculationMethodLabel(detail.type, lang);

  return (
    <details className="group px-4 py-2.5">
      <summary className="flex items-center gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="text-xs text-[var(--gray-500)] tabular-nums w-12 shrink-0">
          {formatTimestamp(entry.timestamp, lang)}
        </span>
        <Badge variant={activityBadgeVariant(entry.source)} className="shrink-0">
          {activityBadgeLabel(entry.source, lang)}
        </Badge>
        <span className="text-sm text-[var(--gray-700)] truncate flex-1">{entry.label}</span>
        <span className="text-[var(--gray-400)] text-xs shrink-0 transition-transform group-open:rotate-180">▾</span>
      </summary>

      <div className="mt-2.5 ml-[60px] pl-3 border-l-2 border-[var(--gray-100)] space-y-2 text-xs">
        <p className="text-[var(--gray-600)]">{detail.summary}</p>

        <div className="text-[var(--gray-500)]">
          <span className="font-semibold">{T.occurredAt[lang]}:</span> {formatFullTimestamp(entry.timestamp, lang)}
        </div>

        {metrics.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {metrics.map((m) => (
              <div key={m.label} className="flex justify-between gap-2">
                <dt className="text-[var(--gray-500)]">{m.label}</dt>
                <dd className="font-semibold tabular-nums">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {method && (
          <p className="text-[var(--gray-500)]">
            <span className="font-semibold">{T.method[lang]}:</span> {method}
          </p>
        )}

        {entry.href && (
          <a href={entry.href} className="inline-block text-[var(--crady-accent)] hover:underline font-semibold">
            {T.viewSource[lang]} →
          </a>
        )}
      </div>
    </details>
  );
}
