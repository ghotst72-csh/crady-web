/** A minimal, dependency-free SVG sparkline — no charting library, just a
 * polyline over a normalized point set. Deliberately tiny (default 80x24):
 * this is a glance-level trend indicator, not a full chart (Web UX/SEO
 * Phase 2, Part 8 — "not too heavy," SVG-based). Renders nothing for
 * fewer than 2 points, since a trend line needs at least two to draw. */
export function Sparkline({
  values,
  width = 80,
  height = 24,
  color = "var(--gray-400)",
  className = "",
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const points = values.filter((v): v is number => v != null);
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;
  const step = (width - pad * 2) / (points.length - 1);
  const coords = points.map(
    (v, i) => `${pad + i * step},${height - pad - ((v - min) / range) * (height - pad * 2)}`
  );

  const up = points[points.length - 1] >= points[0];
  const lineColor = color === "auto" ? (up ? "#0f9d58" : "#d93025") : color;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      role="presentation"
    >
      <polyline fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={coords.join(" ")} />
      <circle cx={coords[coords.length - 1].split(",")[0]} cy={coords[coords.length - 1].split(",")[1]} r="1.75" fill={lineColor} />
    </svg>
  );
}
