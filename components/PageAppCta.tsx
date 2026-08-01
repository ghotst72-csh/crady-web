import { GooglePlayButton } from "./GooglePlayButton";
import { AppStoreBadge } from "./AppStoreBadge";

const ITEMS_EN = ["Dividend Alerts", "Portfolio Tracking", "Predicted Dividend Calculator", "Watchlist"];
const ITEMS_KO = ["배당 알림", "포트폴리오 관리", "예상 배당 계산기", "관심 ETF 등록"];

const T = {
  heading: { en: "Download the CRADY App", ko: "CRADY 앱 다운로드" },
  body: {
    en: "Get dividend alerts the moment a payment is confirmed, track your portfolio's expected income, and let CRADY calculate your predicted dividends automatically.",
    ko: "배당 지급이 확정되는 즉시 알림을 받고, 포트폴리오의 예상 수익을 추적하며, CRADY가 자동으로 계산하는 예상 배당금을 확인하세요.",
  },
} as const;

/** The generic (non-ticker) app-download CTA for pages that aren't a
 * single ETF's profile — Magazine, Ranking, Calendar, Distributions — none
 * of which had any app-install prompt before (Web UX/SEO Phase 2, Part
 * 10). Same visual language as EtfAppCta, generic copy instead of
 * per-ticker messaging. */
export function PageAppCta({ lang = "en" }: { lang?: "en" | "ko" }) {
  const items = lang === "ko" ? ITEMS_KO : ITEMS_EN;
  return (
    <div className="mt-10 pt-8 border-t border-[var(--gray-200)]">
      <div className="border border-[var(--gray-200)] rounded-2xl bg-[var(--gray-50)] p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold">{T.heading[lang]}</h2>
        <p className="mt-1 text-sm text-[var(--gray-600)] max-w-xl">{T.body[lang]}</p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--gray-700)]">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--crady-accent)]" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <GooglePlayButton lang={lang} />
          <AppStoreBadge lang={lang} />
        </div>
      </div>
    </div>
  );
}
