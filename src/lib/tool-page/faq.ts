export interface ToolPageFaqItemLike {
  question?: unknown;
  answer?: unknown;
  answer_source_url?: unknown;
  answer_source_type?: unknown;
}

const VOLATILE_FAQ_TERMS =
  /\b(model|version|pricing|price|plan|quota|limit|token|tokens|rate limit|context window|deprecated|deprecation|gpt|claude|opus|sonnet|haiku|o[1-9])\b/i;
const PRICING_TERMS =
  /\b(price|pricing|plan|tier|monthly|annual|enterprise|max plan|models? available|what models?)\b/i;
const DECISION_SUPPORTIVE_TERMS =
  /\b(integration|integrations|export|exports|implementation|migrat|migration|control|controls|data ownership|ownership|limit|limits|contract|contracts|security|compliance|sso|scim|api|retention)\b/i;
const LOW_VALUE_FAQ_TERMS =
  /\b(what is|is .* good|who owns|overview|history)\b/i;

export function filterToolPageFaqItems(items: unknown): ToolPageFaqItemLike[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is ToolPageFaqItemLike => {
    if (!item || typeof item !== 'object') return false;
    const faqItem = item as ToolPageFaqItemLike;
    if (typeof faqItem.question !== 'string' || typeof faqItem.answer !== 'string') return false;
    if (typeof faqItem.answer_source_url !== 'string' || faqItem.answer_source_url.trim().length === 0) {
      return false;
    }

    const combined = `${faqItem.question} ${faqItem.answer}`;
    if (
      VOLATILE_FAQ_TERMS.test(combined) &&
      faqItem.answer_source_type !== 'official'
    ) {
      return false;
    }
    if (PRICING_TERMS.test(combined)) return false;
    if (LOW_VALUE_FAQ_TERMS.test(combined.toLowerCase())) return false;
    if (!DECISION_SUPPORTIVE_TERMS.test(combined.toLowerCase())) return false;
    return true;
  });
}

export function buildToolPageFaqState<T extends { faqs?: unknown } | null>(
  knowledgeCard: T
): {
  faqItems: ToolPageFaqItemLike[];
  knowledgeCardForSeo: T;
} {
  const faqItems = filterToolPageFaqItems(knowledgeCard?.faqs);
  const originalCount = Array.isArray(knowledgeCard?.faqs) ? knowledgeCard.faqs.length : 0;
  const knowledgeCardForSeo =
    knowledgeCard && faqItems.length !== originalCount
      ? ({ ...knowledgeCard, faqs: faqItems } as T)
      : knowledgeCard;

  return {
    faqItems,
    knowledgeCardForSeo,
  };
}
