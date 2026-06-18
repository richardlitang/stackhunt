import type { ReviewLens } from '@/lib/tool-page/presentation/view-model';

interface ToolPageConstraintLike {
  text: string;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'> | null;
}

function scoreConstraintForLens(text: string, lens: ReviewLens): number {
  const lower = text.toLowerCase();
  if (lens === 'general') return 0;

  if (lens === 'enterprise') {
    let score = 0;
    if (/\b(sso|scim|audit|compliance|soc\s?2|gdpr|admin|governance)\b/.test(lower)) score += 5;
    if (/\b(enterprise|business|contract|procurement)\b/.test(lower)) score += 3;
    if (/\b(limit|cap|quota|plan|tier)\b/.test(lower)) score += 1;
    return score;
  }

  if (lens === 'personal') {
    let score = 0;
    if (/\b(free|trial|seat|user|starter|personal|individual)\b/.test(lower)) score += 5;
    if (/\b(setup fee|one-time|onboarding)\b/.test(lower)) score += 2;
    if (/\b(limit|cap|quota)\b/.test(lower)) score += 1;
    return score;
  }

  let score = 0;
  if (/\b(seat|user|team|workspace|usage|quota|cap)\b/.test(lower)) score += 4;
  if (/\b(automation|api|integration|reporting)\b/.test(lower)) score += 3;
  if (/\b(plan|tier|upgrade|billing)\b/.test(lower)) score += 2;
  return score;
}

function hasLensTag(
  tags: ToolPageConstraintLike['works_for_lenses'],
  lens: Exclude<ReviewLens, 'general'>
): boolean {
  return Array.isArray(tags) && tags.includes(lens);
}

export function rankConstraintsForLens<T extends ToolPageConstraintLike>(
  constraints: T[],
  activeReviewLens: ReviewLens
): T[] {
  if (activeReviewLens === 'general') return constraints;
  const lens = activeReviewLens;
  return [...constraints]
    .map((constraint, index) => ({
      constraint,
      index,
      score:
        (hasLensTag(constraint.works_for_lenses, lens) ? 100 : 0) +
        scoreConstraintForLens(constraint.text, lens),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.constraint);
}
