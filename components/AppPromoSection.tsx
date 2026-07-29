import Image from "next/image";
import { GooglePlayButton } from "./GooglePlayButton";

const FEATURES = [
  { label: "배당 알림", desc: "다음 배당 지급일을 놓치지 않도록 푸시로 알려드립니다." },
  { label: "관심 ETF", desc: "관심 있는 ETF를 등록하고 변동 사항을 바로 확인하세요." },
  { label: "포트폴리오", desc: "보유 ETF를 등록하면 예상 배당 수익을 자동으로 계산합니다." },
  { label: "AI ETF Finder", desc: "투자 성향에 맞는 고배당 ETF를 AI가 찾아드립니다." },
  { label: "개인 리포트", desc: "나의 배당 흐름과 수익률을 한눈에 보는 리포트를 받아보세요." },
];

const SCREENSHOTS = [
  { src: "/app/screenshot-home.png", alt: "CRADY 앱 홈 화면" },
  { src: "/app/screenshot-portfolio.png", alt: "CRADY 앱 포트폴리오 화면" },
  { src: "/app/screenshot-finder.png", alt: "CRADY 앱 AI ETF Finder 화면" },
  { src: "/app/screenshot-report.png", alt: "CRADY 앱 개인 리포트 화면" },
];

export function AppPromoSection() {
  return (
    <section className="border-t border-[var(--gray-200)] bg-[var(--gray-50)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
          <div>
            <div className="text-xs font-semibold text-[var(--crady-accent)] tracking-wide">
              CRADY 앱
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
              웹에서는 조회, <br className="sm:hidden" />
              앱에서는 관리
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--gray-600)] max-w-xl">
              CRADY 웹에서 ETF 정보와 배당 일정을 확인하고, CRADY 앱에서 관심
              ETF·포트폴리오·배당 알림까지 한 번에 관리하세요.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              {FEATURES.map((f) => (
                <div key={f.label}>
                  <div className="text-sm font-bold">{f.label}</div>
                  <div className="text-xs text-[var(--gray-500)] mt-0.5 leading-relaxed">
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>

            <GooglePlayButton className="mt-8" />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SCREENSHOTS.map((s) => (
              <div
                key={s.src}
                className="relative shrink-0 w-[140px] sm:w-[160px] aspect-[9/16] rounded-2xl overflow-hidden border border-[var(--gray-200)] shadow-sm bg-white"
              >
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
