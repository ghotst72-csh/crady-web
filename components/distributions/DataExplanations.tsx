const T = {
  heading: { en: "Understanding These Numbers", ko: "지표 설명" },
  items: [
    {
      title: { en: "Distribution per Share", ko: "주당 분배금" },
      body: {
        en: "The actual dollar amount paid out per share for this specific distribution event, as officially announced by the issuer.",
        ko: "이번 분배 이벤트에서 주당 실제로 지급된 금액으로, 운용사가 공식 발표한 값입니다.",
      },
    },
    {
      title: { en: "Distribution Rate vs. 30-Day SEC Yield", ko: "분배율 vs. 30일 SEC 수익률" },
      body: {
        en: "These are different metrics, not two names for the same thing. Distribution Rate annualizes the most recent per-share payment against the current share price — it moves with every distribution and can include return of capital. The 30-Day SEC Yield is a standardized, SEC-mandated formula based on the fund's actual investment income over the trailing 30 days, intended to be more comparable across funds. A high Distribution Rate does not necessarily mean a high SEC Yield.",
        ko: "이 두 지표는 서로 다른 개념이며 같은 값을 다르게 부르는 것이 아닙니다. 분배율은 가장 최근 주당 지급액을 현재 주가 대비 연환산한 값으로, 매 분배마다 변동하며 원금 반환(ROC)을 포함할 수 있습니다. 30일 SEC 수익률은 SEC가 정한 표준 공식에 따라 최근 30일간의 실제 투자 수익을 기준으로 계산되어, 펀드 간 비교에 더 적합하도록 설계되었습니다. 분배율이 높다고 해서 SEC 수익률도 높다는 의미는 아닙니다.",
      },
    },
    {
      title: { en: "ROC (Return of Capital)", ko: "ROC (원금 반환)" },
      body: {
        en: "ROC is a tax/accounting classification estimate for the portion of a distribution treated as a return of your own invested capital rather than investment income. It is not automatically \"good\" or \"bad,\" and should not be interpreted as a profit-or-loss signal on its own — actual tax treatment depends on your specific holding and is finalized by the fund's official tax reporting (e.g. Form 1099-DIV), not by this estimate.",
        ko: "ROC는 분배금 중 투자 수익이 아니라 투자자 본인의 원금이 반환된 것으로 간주되는 부분에 대한 세무/회계상의 추정치입니다. 이 수치 자체가 무조건 긍정적이거나 부정적인 신호는 아니며, 단독으로 손익을 판단하는 근거로 해석해서는 안 됩니다. 실제 세무 처리는 개인의 보유 상황에 따라 다르며, 최종적으로는 펀드의 공식 세무 보고서(예: Form 1099-DIV)를 기준으로 확정됩니다.",
      },
    },
  ],
  disclaimer: {
    en: "This page presents officially announced or officially sourced data for informational purposes only. It is not investment, tax, or financial advice. Consult a qualified professional about your own situation.",
    ko: "이 페이지는 공식적으로 발표되었거나 공식 출처에서 수집한 데이터를 정보 제공 목적으로만 제공합니다. 투자, 세무 또는 금융 자문이 아닙니다. 본인의 상황에 대해서는 전문가와 상담하시기 바랍니다.",
  },
} as const;

export function DataExplanations({ lang = "en" }: { lang?: "en" | "ko" }) {
  return (
    <section className="mt-10 border-t border-[var(--gray-200)] pt-8">
      <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
      <div className="mt-4 space-y-4">
        {T.items.map((item) => (
          <div key={item.title.en} className="border border-[var(--gray-200)] rounded-xl p-4">
            <div className="font-semibold text-sm">{item.title[lang]}</div>
            <p className="mt-1 text-sm text-[var(--gray-600)] leading-relaxed">{item.body[lang]}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-[var(--gray-500)] leading-relaxed">{T.disclaimer[lang]}</p>
    </section>
  );
}
