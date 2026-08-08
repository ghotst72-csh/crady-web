export type EtfWorkspaceTabId = "summary" | "next-dividend" | "history" | "analysis" | "community";

export const ETF_WORKSPACE_TABS: { id: EtfWorkspaceTabId; label: { en: string; ko: string } }[] = [
  { id: "summary", label: { en: "Summary", ko: "서머리" } },
  { id: "next-dividend", label: { en: "Next Dividend", ko: "다음 배당" } },
  { id: "history", label: { en: "History", ko: "히스토리" } },
  { id: "analysis", label: { en: "Analysis", ko: "분석 도구" } },
  { id: "community", label: { en: "Community", ko: "커뮤니티" } },
];

export const DEFAULT_ETF_WORKSPACE_TAB: EtfWorkspaceTabId = "summary";

export function isEtfWorkspaceTabId(value: string | null | undefined): value is EtfWorkspaceTabId {
  return ETF_WORKSPACE_TABS.some((t) => t.id === value);
}
