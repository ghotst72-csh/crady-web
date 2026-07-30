import type { ReactNode } from "react";

/** One block of an article. Section functions return null when the
 * underlying data isn't available — a missing section is omitted, never
 * filled with a placeholder or fabricated text. */
export type Section = {
  id: string;
  heading: string;
  body: ReactNode;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type ArticleTypeId =
  | "next-dividend-prediction"
  | "dividend-guide"
  | "risk-analysis"
  | "dividend-calendar"
  | "dividend-history"
  | "comparison";

export const ARTICLE_TYPE_LABEL: Record<ArticleTypeId, string> = {
  "next-dividend-prediction": "Next Dividend Prediction",
  "dividend-guide": "Dividend Guide",
  "risk-analysis": "Risk Analysis",
  "dividend-calendar": "Dividend Calendar",
  "dividend-history": "Dividend History",
  comparison: "Comparison",
};
