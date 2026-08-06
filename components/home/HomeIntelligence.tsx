import Link from "next/link";
import type { HomeIntelligence as HomeIntelligenceData, HomeIntelligenceTicker } from "@/lib/home/intelligence";

const T = {
  title: { en: "Today's Intelligence", ko: "오늘의 인텔리전스" },
  todayChanged: { en: "Score Changed Today", ko: "오늘 점수 변경" },
  declaredToday: { en: "Declared Today", ko: "오늘 발표" },
  predictionRaised: { en: "Prediction Raised", ko: "예측 상향" },
  predictionLowered: { en: "Prediction Lowered", ko: "예측 하향" },
  tomorrowExDate: { en: "Tomorrow's Ex-Date", ko: "내일 배당락일" },
  empty: { en: "No changes today.", ko: "오늘은 변경 사항이 없습니다." },
} as const;

function Column({ title, items, basePath, lang }: { title: string; items: HomeIntelligenceTicker[]; basePath: string; lang: "en" | "ko" }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-1.5">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--gray-400)]">{T.empty[lang]}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((item) => (
            <li key={item.ticker} className="text-sm flex items-center justify-between gap-2">
              <Link href={`${basePath}/${item.ticker.toLowerCase()}`} className="font-semibold hover:underline">
                {item.ticker}
              </Link>
              <span className="text-xs text-[var(--gray-500)] tabular-nums">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HomeIntelligence({
  data,
  lang = "en",
  basePath = "",
}: {
  data: HomeIntelligenceData;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold mb-3">{T.title[lang]}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Column title={T.todayChanged[lang]} items={data.todayChanged} basePath={basePath} lang={lang} />
        <Column title={T.declaredToday[lang]} items={data.declaredToday} basePath={basePath} lang={lang} />
        <Column title={T.tomorrowExDate[lang]} items={data.tomorrowExDate} basePath={basePath} lang={lang} />
        <Column title={T.predictionRaised[lang]} items={data.predictionRaised} basePath={basePath} lang={lang} />
        <Column title={T.predictionLowered[lang]} items={data.predictionLowered} basePath={basePath} lang={lang} />
      </div>
    </div>
  );
}
