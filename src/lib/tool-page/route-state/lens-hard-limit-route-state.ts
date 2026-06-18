import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence/evidence-runtime';
import type { ReviewLens } from '@/lib/tool-page/presentation/view-model';
import { rankConstraintsForLens } from '@/lib/tool-page/evidence/constraints-lens';

interface BuildToolPageLensHardLimitRouteStateInput {
  canonicalHardLimits: ReturnType<typeof buildToolPageEvidenceRuntime>['canonicalHardLimits'];
  activeReviewLens: ReviewLens;
}

export function buildToolPageLensHardLimitRouteState(
  input: BuildToolPageLensHardLimitRouteStateInput
): {
  lensRankedHardLimits: ReturnType<typeof rankConstraintsForLens>;
  topLensHardLimit: ReturnType<typeof rankConstraintsForLens>[number] | null;
} {
  const lensRankedHardLimits = rankConstraintsForLens(
    input.canonicalHardLimits,
    input.activeReviewLens
  );

  return {
    lensRankedHardLimits,
    topLensHardLimit: lensRankedHardLimits[0] || null,
  };
}
