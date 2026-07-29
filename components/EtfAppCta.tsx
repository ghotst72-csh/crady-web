import { GooglePlayButton } from "./GooglePlayButton";

const ITEMS = ["관심 ETF 등록", "배당 알림", "포트폴리오 관리", "AI 리포트"];

export function EtfAppCta({ ticker }: { ticker: string }) {
  return (
    <div className="mt-10 border-t border-[var(--gray-200)] pt-8">
      <div className="border border-[var(--gray-200)] rounded-2xl bg-[var(--gray-50)] p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-bold">
          Track {ticker} in CRADY
        </h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">
          CRADY 앱에서 {ticker}를 등록하면 배당 지급일마다 알림을 받고,
          포트폴리오 수익을 자동으로 추적할 수 있습니다.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--gray-700)]">
          {ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--crady-accent)]" />
              {item}
            </li>
          ))}
        </ul>
        <GooglePlayButton className="mt-5" />
      </div>
    </div>
  );
}
