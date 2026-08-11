"use client";

import type { YearlySnapshot } from "@/lib/etfCalculator/calculations";

const WIDTH = 640;
const HEIGHT = 220;
const PAD_L = 8;
const PAD_R = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

function fmtCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Portfolio-growth chart for the ETF Calculator — same minimal, dependency-
 * free SVG approach as components/portfolio/CumulativeTimelineChart.tsx
 * (solid value line + dashed contributions baseline, an accessible text
 * summary alongside the SVG), adapted to a filled area for the reference
 * spec's look and driven by the live calculator inputs rather than real
 * history. Not a real-data chart in the dataviz-skill sense — every point
 * is a projection from user-entered assumptions, which the page's copy
 * states plainly elsewhere; this component only draws whatever `yearly`
 * it's given. */
export function GrowthChart({ yearly }: { yearly: YearlySnapshot[] }) {
  if (yearly.length < 2) return null;

  const values = yearly.map((p) => p.portfolioValue);
  const baseline = yearly.map((p) => p.contributions);
  const allValues = [...values, ...baseline, 0];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const scaleX = (i: number) => PAD_L + (i / (yearly.length - 1)) * (WIDTH - PAD_L - PAD_R);
  const scaleY = (v: number) => HEIGHT - PAD_BOTTOM - ((v - min) / range) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

  const linePath = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`).join(" ");
  const areaPath = `${linePath(values)} L${scaleX(values.length - 1)},${HEIGHT - PAD_BOTTOM} L${scaleX(0)},${HEIGHT - PAD_BOTTOM} Z`;

  const up = values[values.length - 1] >= values[0];
  const lineColor = up ? "#0f9d58" : "#d93025";

  // Up to ~6 evenly-spaced year labels regardless of the horizon length —
  // "useful intervals," not one tick per year on a 50-year projection.
  const maxTicks = 6;
  const tickStep = Math.max(1, Math.round((yearly.length - 1) / (maxTicks - 1)));
  const tickIndices = [];
  for (let i = 0; i < yearly.length; i += tickStep) tickIndices.push(i);
  if (tickIndices[tickIndices.length - 1] !== yearly.length - 1) tickIndices.push(yearly.length - 1);

  const yTicks = [min, min + range / 2, max];

  const first = yearly[0];
  const last = yearly[yearly.length - 1];
  const summaryText = `Projected portfolio value grows from ${fmtCompact(first.portfolioValue)} at year 0 to ${fmtCompact(last.portfolioValue)} at year ${last.year}, against total contributions of ${fmtCompact(last.contributions)}.`;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-56" preserveAspectRatio="none" role="img" aria-label={summaryText}>
        <defs>
          <linearGradient id="etfcalc-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.16" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => (
          <line key={i} x1={PAD_L} y1={scaleY(t)} x2={WIDTH - PAD_R} y2={scaleY(t)} stroke="var(--gray-100)" strokeWidth="1" />
        ))}

        <path d={areaPath} fill="url(#etfcalc-area-fill)" stroke="none" />
        <path d={linePath(baseline)} fill="none" stroke="var(--gray-300)" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d={linePath(values)} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {yearly.map((p, i) => (
          <circle key={i} cx={scaleX(i)} cy={scaleY(p.portfolioValue)} r="2.5" fill={lineColor}>
            <title>{`Year ${p.year}: ${fmtCompact(p.portfolioValue)} (contributed ${fmtCompact(p.contributions)})`}</title>
          </circle>
        ))}

        {tickIndices.map((i) => (
          <text key={i} x={scaleX(i)} y={HEIGHT - 6} fontSize="10" fill="var(--gray-500)" textAnchor="middle">
            {yearly[i].year}{yearly[i].year === yearly[yearly.length - 1].year ? " yrs" : ""}
          </text>
        ))}

        {yTicks.map((t, i) => (
          <text key={i} x={2} y={scaleY(t) - 3} fontSize="9" fill="var(--gray-400)">
            {fmtCompact(t)}
          </text>
        ))}
      </svg>

      <div className="mt-1.5 flex items-center gap-4 text-[11px] text-[var(--gray-500)]">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full inline-block" style={{ backgroundColor: lineColor }} /> Estimated Portfolio Value
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 inline-block" style={{ borderTop: "1.5px dashed var(--gray-300)" }} /> Total Contributions
        </span>
      </div>
      <p className="sr-only">{summaryText}</p>
    </div>
  );
}
