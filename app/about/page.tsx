import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { GooglePlayButton } from "@/components/GooglePlayButton";

export const metadata: Metadata = {
  title: "소개 & 데이터 방법론",
  description:
    "CRADY는 고배당 커버드콜 ETF 정보를 제공하는 웹사이트입니다. 배당 예측·CRADY 점수 산출 방식, 데이터 출처, 업데이트 주기를 투명하게 공개합니다.",
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

      <div id="methodology" className="mt-12 pt-2 scroll-mt-20">
        <h2 className="text-lg font-bold">데이터 &amp; 예측 방법론</h2>
        <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
          CRADY의 모든 수치는 사람이 직접 작성하거나 추측한 값이 아니라, 아래
          규칙 기반 로직으로 자동 계산됩니다. 각 항목의 산출 방식을 그대로
          공개합니다.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <div className="font-semibold text-sm">연환산 분배율 (Annual Distribution Yield)</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              최근 90일간 실제 지급된 배당금 합계를 90일로 나눠 일평균을 구한
              뒤 365를 곱하고, 현재가로 나눈 &quot;실지급 run-rate&quot;
              방식입니다. 운용사가 공시하는 예상 수익률이 아니라 최근 실제
              지급 내역만을 근거로 하므로, 배당금이 변동하면 수치도 함께
              변합니다.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">다음 배당 예측 (Next Dividend Prediction)</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              두 가지 방식 중 하나로 산출됩니다. ① 운용사가 다음 지급 일정을
              공식 발표한 경우, 해당 예정일과 최근 실제 지급액의 가중평균을
              사용합니다. ② 공식 일정이 없는 경우, 과거 지급 간격의 통계적
              패턴(주기·중앙값)으로 다음 예정일을 추정합니다. 어느 쪽이든
              충분한 데이터가 없는 ETF는 예측을 표시하지 않으며, 각 예측에는
              신뢰도 점수와 산출 방식이 함께 표기됩니다.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">CRADY 점수 &amp; 위험도</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              최근 가격 변동성(30일/90일), 최대 낙폭(drawdown), 배당 지급액의
              회차별 변동 정도(배당 안정성 점수)를 종합해 계산합니다. 수익률이
              높다고 CRADY 점수가 높은 것은 아니며, 변동성이 크거나 배당이
              불규칙할수록 점수가 낮아지도록 설계되어 있습니다. 과거 데이터
              기반 지표이며 미래 성과를 보장하지 않습니다.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">데이터 출처</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              가격, 배당 지급 내역, 배당 일정은 각 ETF 운용사가 공개하는
              공시 자료 및 공개 시장 데이터를 기반으로 수집합니다.
            </p>
          </div>

          <div>
            <div className="font-semibold text-sm">업데이트 주기</div>
            <p className="text-sm text-[var(--gray-600)] mt-1 leading-relaxed">
              전체 ETF의 가격, 배당 내역, 예측치, CRADY 점수는 매일 자동화된
              파이프라인을 통해 갱신됩니다. 사람이 수동으로 개별 수치를
              편집하지 않습니다. 각 ETF 페이지의 &quot;업데이트&quot; 표시는
              해당 데이터가 마지막으로 계산된 실제 시각입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-bold">면책조항</h2>
        <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">
          CRADY가 제공하는 모든 수치(연환산 분배율, CRADY 점수, 다음 배당
          예측 등)는 과거 데이터를 기반으로 한 통계적 추정치이며, 투자 권유나
          금융 자문이 아닙니다. 특히 배당 예측은 확정된 사실이 아니라
          추정치이며, 실제 지급일과 지급액은 운용사의 공식 발표로 달라질 수
          있습니다. 모든 투자 판단과 그 결과에 대한 책임은 이용자 본인에게
          있습니다. 개인정보 처리 및 서비스 이용에 관한 자세한 내용은
          개인정보처리방침과 이용약관을 참고하세요.
        </p>
      </div>
    </div>
  );
}
