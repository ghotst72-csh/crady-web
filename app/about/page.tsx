import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { GooglePlayButton } from "@/components/GooglePlayButton";

export const metadata: Metadata = {
  title: "소개",
  description:
    "CRADY는 고배당 커버드콜 ETF 정보를 제공하는 웹사이트이자 CRADY 앱의 공식 홈페이지입니다.",
  alternates: { canonical: "https://crady.net/about" },
};

const REASONS = [
  {
    title: "실지급 기준 데이터",
    desc: "공시 예정치가 아니라 최근 90일 실제 지급된 배당금 run-rate를 기준으로 연환산 분배율을 계산합니다.",
  },
  {
    title: "CRADY 점수",
    desc: "분배율뿐 아니라 변동성, 배당 안정성을 함께 반영한 점수로 ETF를 비교할 수 있습니다.",
  },
  {
    title: "다음 배당 예측",
    desc: "과거 지급 패턴을 기반으로 다음 배당금과 지급일, 신뢰도를 미리 확인할 수 있습니다.",
  },
];

const COMPARISON: { item: string; web: string; app: string }[] = [
  { item: "ETF 정보 조회", web: "가능", app: "가능" },
  { item: "배당 일정 확인", web: "가능", app: "가능" },
  { item: "관심 ETF 등록 및 알림", web: "—", app: "가능" },
  { item: "포트폴리오 관리", web: "—", app: "가능" },
  { item: "AI ETF Finder", web: "—", app: "가능" },
  { item: "개인 리포트", web: "—", app: "가능" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: "소개", url: "https://crady.net/about" },
        ]}
      />
      <h1 className="text-2xl font-bold">CRADY 소개</h1>
      <p className="mt-3 text-[var(--gray-600)] text-sm leading-relaxed">
        CRADY는 YieldMax, Roundhill, Defiance 등 고배당 커버드콜 ETF의 배당
        일정, 가격, 예상 배당, 위험도를 한눈에 확인할 수 있는 웹사이트이자,
        CRADY 모바일 앱의 공식 홈페이지입니다.
      </p>

      <h2 className="mt-10 text-lg font-bold">왜 CRADY인가</h2>
      <div className="mt-4 space-y-5">
        {REASONS.map((r) => (
          <div key={r.title}>
            <div className="font-semibold text-sm">{r.title}</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              {r.desc}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold">웹과 앱의 차이</h2>
      <p className="mt-2 text-sm text-[var(--gray-600)]">
        웹에서는 조회, 앱에서는 관리 — CRADY 웹은 로그인 없이 누구나 빠르게
        ETF 정보를 확인하는 용도이고, 개인화된 관리 기능은 앱에서 제공합니다.
      </p>
      <div className="mt-4 border border-[var(--gray-200)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">기능</th>
              <th className="text-center px-4 py-2 font-medium">웹</th>
              <th className="text-center px-4 py-2 font-medium">앱</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            {COMPARISON.map((row) => (
              <tr key={row.item}>
                <td className="px-4 py-2">{row.item}</td>
                <td className="px-4 py-2 text-center text-[var(--gray-400)]">
                  {row.web}
                </td>
                <td className="px-4 py-2 text-center font-semibold text-[var(--crady-accent)]">
                  {row.app}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 border border-[var(--gray-200)] rounded-2xl bg-[var(--gray-50)] p-6">
        <h2 className="text-lg font-bold">CRADY 앱 시작하기</h2>
        <p className="mt-1 text-sm text-[var(--gray-600)]">
          관심 ETF 등록, 배당 알림, 포트폴리오 관리까지 CRADY 앱에서 무료로
          이용할 수 있습니다.
        </p>
        <GooglePlayButton className="mt-4" />
      </div>

      <p className="mt-10 text-xs text-[var(--gray-400)] leading-relaxed">
        본 사이트에서 제공하는 정보는 투자 권유 또는 금융 자문이 아니며,
        실제 투자 판단은 이용자 본인의 책임입니다.
      </p>
    </div>
  );
}
