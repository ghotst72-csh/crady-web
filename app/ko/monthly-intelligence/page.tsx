import type { Metadata } from "next";
import Link from "next/link";
import { getHomeSnapshot } from "@/lib/data";
import { getRecentChangeEvents } from "@/lib/activity/data";
import { buildWeeklyIntelligence, type WeeklyTicker } from "@/lib/home/weekly";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PageShell } from "@/components/layout/PageShell";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "월간 인텔리전스 — CRADY",
  description: "이번 달 전체 추적 ETF의 분배 발표, CRADY 점수 변동, 예정된 배당락일, 수익률 변동을 확인하세요.",
  alternates: {
    canonical: "https://crady.net/ko/monthly-intelligence",
    languages: {
      en: "https://crady.net/monthly-intelligence",
      ko: "https://crady.net/ko/monthly-intelligence",
      "x-default": "https://crady.net/monthly-intelligence",
    },
  },
};

function Section({ title, items, empty }: { title: string; items: WeeklyTicker[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-[var(--gray-200)] bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold mb-3">
        {title} <span className="text-[var(--gray-400)] font-normal text-sm">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--gray-400)]">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={`${item.ticker}-${i}`} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--gray-100)] last:border-0 pb-1.5 last:pb-0">
              <Link href={`/ko/${item.ticker.toLowerCase()}`} className="font-semibold hover:underline">
                {item.ticker}
              </Link>
              <span className="text-[var(--gray-600)] text-right">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function MonthlyIntelligenceKoPage() {
  const [snapshot, changeEvents30d] = await Promise.all([
    getHomeSnapshot(),
    getRecentChangeEvents({ days: 30, lang: "ko" }),
  ]);
  const data = buildWeeklyIntelligence(snapshot, changeEvents30d, new Date(), 30);

  return (
    <PageShell>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", url: "https://crady.net/ko" },
          { name: "월간 인텔리전스", url: "https://crady.net/ko/monthly-intelligence" },
        ]}
      />
      <h1 className="text-2xl font-bold">월간 인텔리전스</h1>
      <p className="text-sm text-[var(--gray-500)] mt-1 max-w-2xl">
        아래 모든 섹션은 실제 현재 데이터를 규칙 기반으로 계산한 결과이며, AI 모델 호출은 사용하지 않습니다. 이번 달
        실제 이벤트가 없는 섹션은 조작된 값 대신 정직하게 빈 상태를 표시합니다.{" "}
        <Link href="/ko/weekly-intelligence" className="underline hover:text-black">
          7일 보기 →
        </Link>
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="분배 발표" items={data.distributions} empty="최근 30일간 분배 발표 이벤트가 없습니다." />
        <Section title="점수 변동" items={data.scoreChanges} empty="최근 30일간 CRADY 점수 변동이 없습니다." />
        <Section title="위험 등급 변동" items={data.riskLevelChanges} empty="최근 30일간 위험 등급 변동이 없습니다." />
        <Section title="예측 변동" items={data.predictionChanges} empty="최근 30일간 예측 변동이 없습니다." />
        <Section title="예정된 배당락일" items={data.upcomingExDates} empty="향후 30일 내 예정된 배당락일이 없습니다." />
        <Section title="수익률 변동 상위" items={data.yieldMovers} empty="이번 달 눈에 띄는 분배 수익률 변동이 없습니다." />
      </div>
    </PageShell>
  );
}
