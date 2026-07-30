import { GooglePlayButton } from "./GooglePlayButton";

const ITEMS_EN = ["Add to Watchlist", "Dividend Alerts", "Portfolio Tracking", "AI Reports"];
const ITEMS_KO = ["관심 ETF 등록", "배당 알림", "포트폴리오 관리", "AI 리포트"];

const T = {
  heading: { en: (t: string) => `Track ${t} in CRADY`, ko: (t: string) => `CRADY에서 ${t} 추적하기` },
  body: {
    en: (t: string) =>
      `Register ${t} in the CRADY app to get a notification on every dividend date and automatically track your portfolio returns.`,
    ko: (t: string) =>
      `CRADY 앱에서 ${t}를 등록하면 배당 지급일마다 알림을 받고, 포트폴리오 수익을 자동으로 추적할 수 있습니다.`,
  },
} as const;

export function EtfAppCta({ ticker, lang = "en" }: { ticker: string; lang?: "en" | "ko" }) {
  const items = lang === "ko" ? ITEMS_KO : ITEMS_EN;
  return (
    <div className="mt-10 border-t border-[var(--gray-200)] pt-8">
      <div className="border border-[var(--gray-200)] rounded-2xl bg-[var(--gray-50)] p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold">{T.heading[lang](ticker)}</h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">{T.body[lang](ticker)}</p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--gray-700)]">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--crady-accent)]" />
              {item}
            </li>
          ))}
        </ul>
        <GooglePlayButton className="mt-5" lang={lang} />
      </div>
    </div>
  );
}
