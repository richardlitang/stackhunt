interface ToolPageFaqItemLike {
  question: string;
  answer: string;
  answer_source_url?: string | null;
}

const LOW_VALUE_FAQ_TERMS = /\b(what is|is .* good|who owns|overview|history)\b/i;
const DECISION_SUPPORTIVE_TERMS =
  /\b(integration|integrations|export|exports|implementation|migrat|migration|control|controls|data ownership|ownership|limit|limits|contract|contracts|security|compliance|sso|scim|api|retention)\b/i;

function isDecisionSupportiveFaq(item: ToolPageFaqItemLike): boolean {
  const question = item.question.trim();
  const answer = item.answer.trim();
  if (!question || !answer) return false;
  const combined = `${question} ${answer}`.toLowerCase();
  if (LOW_VALUE_FAQ_TERMS.test(combined)) return false;
  return DECISION_SUPPORTIVE_TERMS.test(combined);
}

export function buildToolPageFaqItemsView<TItem extends ToolPageFaqItemLike>(
  items: TItem[]
): Array<TItem & { hasSourceLink: boolean }> {
  const seenQuestions = new Set<string>();
  return items
    .filter((item) => isDecisionSupportiveFaq(item))
    .filter((item) => {
      const normalizedQuestion = item.question.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!normalizedQuestion || seenQuestions.has(normalizedQuestion)) return false;
      seenQuestions.add(normalizedQuestion);
      return true;
    })
    .map((item) => ({
      ...item,
      hasSourceLink: Boolean(item.answer_source_url),
    }));
}
