import { ImageResponse } from "next/og";
import {
  getEtf,
  getRiskMetrics,
  getLatestPrice,
  getDistributionsSince,
  computeRunRateAnnualYieldPct,
  providerLabel,
} from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RISK_LABEL: Record<string, string> = {
  SAFE: "안정",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "고위험",
};

export default async function Image({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();
  const [etf, risk, price, recentDistributions] = await Promise.all([
    getEtf(ticker),
    getRiskMetrics(ticker),
    getLatestPrice(ticker),
    getDistributionsSince(ticker, 90),
  ]);

  const annualYieldPct = computeRunRateAnnualYieldPct(
    recentDistributions,
    price?.close_price ?? null
  );
  const provider = etf ? providerLabel(etf.provider_id) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#ffffff",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#9e9e9e" }}>
          CRA<span style={{ color: "#f59e0b" }}>DY</span> · {provider}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", marginTop: 32 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 900, color: "#111111" }}>
            {ticker}
          </div>
          {risk?.risk_level && (
            <div
              style={{
                display: "flex",
                marginLeft: 24,
                fontSize: 28,
                color: "#525252",
                background: "#f5f5f5",
                borderRadius: 999,
                padding: "8px 24px",
              }}
            >
              {RISK_LABEL[risk.risk_level] ?? risk.risk_level}
            </div>
          )}
        </div>

        <div style={{ display: "flex", marginTop: 8, fontSize: 30, color: "#525252" }}>
          {etf?.name ?? ticker}
        </div>

        <div style={{ display: "flex", marginTop: 56, gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, color: "#9e9e9e" }}>연환산 분배율</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 900, color: "#f59e0b" }}>
              {annualYieldPct != null ? `${annualYieldPct.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, color: "#9e9e9e" }}>CRADY 점수</div>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 900, color: "#111111" }}>
              {risk?.crady_score != null ? risk.crady_score.toFixed(1) : "—"}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
