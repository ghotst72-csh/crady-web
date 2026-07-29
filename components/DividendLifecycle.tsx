import { getDividendStage, DIVIDEND_STAGE_LABEL, type DividendStage } from "@/lib/dividend";

export function DividendStagePill({
  exDate,
  payDate,
}: {
  exDate: string;
  payDate: string;
}) {
  const stage = getDividendStage(exDate, payDate);
  const color =
    stage === "paid"
      ? "bg-[var(--gray-100)] text-[var(--gray-600)]"
      : stage === "awaiting-payment"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {DIVIDEND_STAGE_LABEL[stage]}
    </span>
  );
}

const STEPS: { key: DividendStage | "declaration"; label: string; hint: string }[] = [
  { key: "declaration", label: "공시", hint: "배당금 및 기준일 발표" },
  { key: "before-ex", label: "Ex-Date", hint: "이 날짜 이전에 보유해야 배당 대상" },
  { key: "awaiting-payment", label: "지급 대기", hint: "기준일 이후 지급 처리 중" },
  { key: "paid", label: "지급", hint: "계좌로 배당금 입금" },
];

/** Educational stepper — highlights where a given (exDate, payDate) pair
 * currently sits. Declaration has no reliable date in the data model, so it's
 * shown only as a conceptual first step, never with a fabricated date. */
export function DividendLifecycleStepper({
  exDate,
  payDate,
}: {
  exDate: string;
  payDate: string;
}) {
  const stage = getDividendStage(exDate, payDate);
  const activeIndex = stage === "before-ex" ? 1 : stage === "awaiting-payment" ? 2 : 3;

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-start flex-1 last:flex-none">
          <div className="flex flex-col items-center text-center w-20 sm:w-24">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                i <= activeIndex
                  ? "bg-black text-white"
                  : "bg-[var(--gray-100)] text-[var(--gray-400)]"
              }`}
            >
              {i + 1}
            </div>
            <div
              className={`mt-1.5 text-xs font-semibold ${
                i <= activeIndex ? "text-black" : "text-[var(--gray-400)]"
              }`}
            >
              {step.label}
            </div>
            <div className="text-[10px] text-[var(--gray-400)] mt-0.5 leading-tight hidden sm:block">
              {step.hint}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-[2px] flex-1 mt-3 ${
                i < activeIndex ? "bg-black" : "bg-[var(--gray-200)]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
