import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개",
  description: "CRADY는 고배당 커버드콜 ETF 정보를 제공하는 서비스입니다.",
  alternates: { canonical: "https://crady.net/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">CRADY 소개</h1>
      <div className="mt-6 space-y-4 text-[var(--gray-700)] leading-relaxed text-sm">
        <p>
          CRADY는 YieldMax, Roundhill, Defiance 등 고배당 커버드콜 ETF의
          배당 일정, 가격, 예상 배당, 위험도를 한눈에 확인할 수 있는
          정보 제공 서비스입니다.
        </p>
        <p>
          본 사이트에서 제공하는 정보는 투자 권유 또는 금융 자문이
          아니며, 실제 투자 판단은 이용자 본인의 책임입니다.
        </p>
        <p>
          더 다양한 기능(포트폴리오 관리, 관심 ETF, 알림 등)은 CRADY
          모바일 앱에서 이용하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}
