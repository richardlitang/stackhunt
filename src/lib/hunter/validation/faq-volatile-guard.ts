type FaqSourceType = 'official' | 'editorial' | 'community' | undefined;

export interface FaqEntry {
  question: string;
  answer: string;
  question_source?: 'paa' | 'forum' | 'reddit';
  question_source_url?: string;
  answer_source_url?: string;
  answer_source_type?: FaqSourceType;
}

export interface FaqGuardResult<T extends FaqEntry> {
  accepted: T[];
  dropped: Array<{ faq: T; reason: string }>;
  conflictsCount: number;
}

const VOLATILE_TERMS =
  /\b(model|version|pricing|price|plan|quota|limit|token|tokens|rate limit|context window|deprecated|deprecation|gpt|claude|opus|sonnet|haiku|o[1-9])\b/i;

const MODEL_MENTION_REGEX =
  /\b(gpt[-\w.]*|o[1-9][\w.-]*|claude\s+(?:opus|sonnet|haiku)\s*\d+(?:\.\d+)?|claude[-\w.]*)\b/gi;

function isVolatileFaq(faq: FaqEntry): boolean {
  return VOLATILE_TERMS.test(`${faq.question} ${faq.answer}`);
}

function normalizeModelToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(19|20)\d{2}[- ]?(0[1-9]|1[0-2])[- ]?(0[1-9]|[12]\d|3[01])\b/g, '')
    .replace(/\b\d{6,8}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractModelTokens(text: string): string[] {
  const matches = text.match(MODEL_MENTION_REGEX) || [];
  return Array.from(new Set(matches.map((m) => normalizeModelToken(m)).filter(Boolean)));
}

export function guardFaqVolatileFacts<T extends FaqEntry>(
  faqs: T[],
  canonicalLatestModels: string[]
): FaqGuardResult<T> {
  if (!Array.isArray(faqs) || faqs.length === 0) {
    return { accepted: [], dropped: [], conflictsCount: 0 };
  }

  const normalizedCanonical = canonicalLatestModels.map((m) => normalizeModelToken(m));
  const accepted: T[] = [];
  const dropped: Array<{ faq: T; reason: string }> = [];
  let conflictsCount = 0;

  for (const faq of faqs) {
    const volatile = isVolatileFaq(faq);
    if (!volatile) {
      accepted.push(faq);
      continue;
    }

    if (!faq.answer_source_url || faq.answer_source_type !== 'official') {
      dropped.push({
        faq,
        reason: 'volatile_fact_requires_official_source',
      });
      continue;
    }

    const mentionedModels = extractModelTokens(`${faq.question} ${faq.answer}`);
    const hasModelConflict =
      mentionedModels.length > 0 &&
      normalizedCanonical.length > 0 &&
      mentionedModels.some(
        (token) =>
          !normalizedCanonical.some(
            (canonical) => canonical.includes(token) || token.includes(canonical)
          )
      );

    if (hasModelConflict) {
      conflictsCount += 1;
      dropped.push({
        faq,
        reason: 'volatile_model_conflict_with_canonical',
      });
      continue;
    }

    accepted.push(faq);
  }

  return {
    accepted,
    dropped,
    conflictsCount,
  };
}
