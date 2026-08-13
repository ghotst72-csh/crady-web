import { DollarSign, Banknote, TrendingUp } from "lucide-react";

/** Illustrative-only preview shown before the user calculates anything —
 * every figure here is a fixed, made-up placeholder, never real ETF data.
 * Replaced entirely by <HistoricalResultCard> (real calculation output,
 * untouched by this component) the moment a result exists. */
export function ResultPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-blue-600">What you&apos;ll see</div>
        <div className="text-xs text-[var(--gray-400)]">Example result (not real data)</div>
      </div>

      <div className="mt-4 space-y-2.5">
        <PreviewRow
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Initial Investment"
          value="$10,000"
        />
        <PreviewRow
          icon={Banknote}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="Distributions Received"
          value="+$4,280"
          sublabel="52 payments"
        />
        <PreviewRow
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Share Value at Sale"
          value="$7,650"
        />
      </div>

      <div className="mt-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 px-5 py-5 text-white flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-black tracking-tight">$11,930</div>
          <div className="text-xs text-white/70 font-semibold">Total Value</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-tight">+19.3%</div>
          <div className="text-xs text-white/70 font-semibold">Total Return</div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[var(--gray-400)]">
        Real results will appear here after you calculate.
      </p>
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sublabel,
}: {
  icon: typeof DollarSign;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--gray-100)] px-3.5 py-3">
      <span className={`shrink-0 w-9 h-9 rounded-full ${iconBg} flex items-center justify-center`}>
        <Icon size={16} className={iconColor} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-base font-black text-[var(--gray-900)] tracking-tight">{value}</div>
        <div className="text-xs text-[var(--gray-500)]">{label}</div>
      </div>
      {sublabel && <div className="shrink-0 text-xs text-[var(--gray-400)]">{sublabel}</div>}
    </div>
  );
}
