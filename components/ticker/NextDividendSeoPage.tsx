import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { NextDividendPanel, type NextDividendPanelData, type NextDividendPanelRange } from "@/components/etf/NextDividendPanel";
import { ProfileFaq } from "@/components/ticker/ProfileSeoBlock";
import { PredictionTrackRecord } from "@/components/ticker/PredictionTrackRecord";
import { EtfAppCta } from "@/components/EtfAppCta";
import type { TrackRecord } from "@/lib/ticker/nextDividendIntelligence";
import type { EvaluatedPredictionRow } from "@/lib/distributions/data";
import type { NextDividendFaqItem } from "@/lib/ticker/nextDividendNarrative";

const T = {
  eyebrowEstimated: { en: "CRADY Estimate", ko: "CRADY 예상치" },
  eyebrowOfficial: { en: "Officially Declared", ko: "공식 발표" },
  outlookHeading: {
    en: (label: string | null, ticker: string) => (label ? `This Week's ${ticker} Dividend Outlook` : `${ticker} Dividend Outlook`),
    ko: (label: string | null, ticker: string) => `${ticker} 이번 주 배당 전망`,
  },
  weekOf: { en: (label: string) => `Week of ${label}`, ko: (label: string) => `${label}` },
  eligibilityHeading: { en: "Dividend Eligibility", ko: "배당 자격 안내" },
  faqHeading: { en: "Frequently Asked Questions", ko: "자주 묻는 질문" },
  fullAnalysis: { en: (ticker: string) => `View ${ticker}'s full ETF profile →`, ko: (ticker: string) => `${ticker} ETF 상세 정보 보기 →` },
  guideLink: {
    en: (ticker: string) => `Read the full ${ticker} Next Dividend Prediction guide →`,
    ko: (ticker: string) => `${ticker} 배당 예측 가이드 전체 보기 →`,
  },
} as const;

export type NextDividendSeoPageProps = {
  ticker: string;
  etfName: string | null;
  weekLabel: string | null;
  panelData: NextDividendPanelData;
  panelRange: NextDividendPanelRange | null;
  outlookParagraphs: string[];
  eligibilityNote: string | null;
  faqItems: NextDividendFaqItem[];
  trackRecord: TrackRecord | null;
  evaluatedHistory: EvaluatedPredictionRow[];
  ticketBasePath: string; // "" for EN, "/ko" for KO
  magazineHref: string | null;
  lang?: "en" | "ko";
};

export function NextDividendSeoPage({
  ticker,
  weekLabel,
  panelData,
  panelRange,
  outlookParagraphs,
  eligibilityNote,
  faqItems,
  trackRecord,
  evaluatedHistory,
  ticketBasePath,
  magazineHref,
  lang = "en",
}: NextDividendSeoPageProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
          {panelData.isOfficial ? T.eyebrowOfficial[lang] : T.eyebrowEstimated[lang]}
        </span>
        {weekLabel && <Badge variant="neutral">{T.weekOf[lang](weekLabel)}</Badge>}
      </div>

      <h1 className="mt-2 text-2xl sm:text-3xl font-bold leading-snug">
        {lang === "ko" ? `${ticker} 다음 배당` : `${ticker} Next Dividend`}
      </h1>

      <div className="mt-5">
        <NextDividendPanel data={panelData} expectedRange={panelRange} lang={lang} />
      </div>

      <section className="mt-8" id="outlook">
        <h2 className="text-lg font-bold mb-3">{T.outlookHeading[lang](weekLabel, ticker)}</h2>
        <div className="space-y-3 max-w-[850px]">
          {outlookParagraphs.map((p, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4"
                  : "text-sm text-[var(--gray-700)] leading-relaxed"
              }
            >
              {p}
            </p>
          ))}
        </div>
      </section>

      {eligibilityNote && (
        <section className="mt-6 border border-[var(--gray-200)] rounded-xl p-4 sm:p-5 bg-[var(--gray-50)]">
          <h3 className="text-sm font-bold">{T.eligibilityHeading[lang]}</h3>
          <p className="mt-1.5 text-sm text-[var(--gray-600)]">{eligibilityNote}</p>
        </section>
      )}

      <ProfileFaq items={faqItems} lang={lang} />

      <div className="mt-8">
        <PredictionTrackRecord trackRecord={trackRecord} rows={evaluatedHistory} lang={lang} />
      </div>

      <div className="mt-8 flex flex-col gap-2 text-sm">
        <Link href={`${ticketBasePath}/${ticker.toLowerCase()}`} className="font-medium text-[#92400e] hover:underline">
          {T.fullAnalysis[lang](ticker)}
        </Link>
        {magazineHref && (
          <Link href={magazineHref} className="font-medium text-[#92400e] hover:underline">
            {T.guideLink[lang](ticker)}
          </Link>
        )}
      </div>

      <EtfAppCta ticker={ticker} lang={lang} />
    </>
  );
}
