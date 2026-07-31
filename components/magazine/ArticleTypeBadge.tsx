import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { ARTICLE_TYPE_LABEL, type ArticleTypeId } from "@/lib/magazine/types";

const ARTICLE_TYPE_VARIANT: Record<ArticleTypeId, BadgeVariant> = {
  "next-dividend-prediction": "blue",
  "risk-analysis": "red",
  "dividend-guide": "neutral",
  "dividend-history": "neutral",
  "dividend-calendar": "green",
  comparison: "violet",
};

const ARTICLE_TYPE_LABEL_KO: Record<ArticleTypeId, string> = {
  "next-dividend-prediction": "예측",
  "dividend-guide": "가이드",
  "risk-analysis": "리스크",
  "dividend-calendar": "일정",
  "dividend-history": "이력",
  comparison: "비교",
};

export function ArticleTypeBadge({
  type,
  lang = "en",
  className = "",
}: {
  type: ArticleTypeId;
  lang?: "en" | "ko";
  className?: string;
}) {
  return (
    <Badge variant={ARTICLE_TYPE_VARIANT[type]} className={className}>
      {lang === "ko" ? ARTICLE_TYPE_LABEL_KO[type] : ARTICLE_TYPE_LABEL[type]}
    </Badge>
  );
}
