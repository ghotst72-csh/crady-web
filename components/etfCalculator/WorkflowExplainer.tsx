import { ShoppingCart, Banknote, TrendingUp, Trophy, ArrowRight } from "lucide-react";

const STEPS = [
  {
    n: 1,
    icon: ShoppingCart,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Buy ETF",
    body: "Invest your money",
  },
  {
    n: 2,
    icon: Banknote,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "Collect Distributions",
    body: "Receive every dividend",
  },
  {
    n: 3,
    icon: TrendingUp,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    title: "Sell ETF",
    body: "Sell your shares",
  },
] as const;

/** Purely explanatory — no data, no calculation. Reproduces the approved
 * "Buy ETF -> Collect Distributions -> Sell ETF -> See Your Real Return"
 * workflow strip above the calculator. Icons are lucide-react (already a
 * project dependency) rather than an external image asset. */
export function WorkflowExplainer() {
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-white p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-3">
        {STEPS.map((step, i) => (
          <div key={step.n} className="flex items-center gap-3 sm:contents">
            <WorkflowStep {...step} />
            {i < STEPS.length - 1 && (
              <ArrowRight
                size={20}
                strokeWidth={2.5}
                className="hidden sm:block shrink-0 text-blue-300 mt-6"
                aria-hidden="true"
              />
            )}
          </div>
        ))}

        <div className="hidden sm:block shrink-0 mt-6">
          <ArrowRight size={20} strokeWidth={2.5} className="text-blue-300" aria-hidden="true" />
        </div>

        <div className="flex items-center gap-3 sm:contents">
          <div className="relative flex-1 sm:flex-none">
            <span className="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
              4
            </span>
            <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:w-32">
              <span className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-sm">
                <Trophy size={22} className="text-white" aria-hidden="true" />
              </span>
              <div className="sm:mt-2 sm:text-left">
                <div className="text-sm font-bold text-[var(--gray-900)] leading-snug">See Your Real Return</div>
                <div className="text-xs text-[var(--gray-500)] leading-snug">Total value = price change + dividends</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-blue-100 text-center">
        <span className="text-sm font-bold text-blue-600">
          No projections. No assumptions. Just real historical results.
        </span>
      </div>
    </div>
  );
}

function WorkflowStep({
  n,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  body,
}: {
  n: number;
  icon: typeof ShoppingCart;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative flex-1 sm:flex-none">
      <span className="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
        {n}
      </span>
      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:w-32">
        <span className={`shrink-0 w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
          <Icon size={22} className={iconColor} aria-hidden="true" />
        </span>
        <div className="sm:mt-2 sm:text-left">
          <div className="text-sm font-bold text-[var(--gray-900)] leading-snug">{title}</div>
          <div className="text-xs text-[var(--gray-500)] leading-snug">{body}</div>
        </div>
      </div>
    </div>
  );
}
