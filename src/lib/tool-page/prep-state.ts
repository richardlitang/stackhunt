import { buildToolPageAlternativesRuntimeFromItems } from '@/lib/tool-page/alternatives-runtime';
import { buildToolPageAlternativesViewFields } from '@/lib/tool-page/alternatives-view-fields';
import { createToolPageEvidenceBulletAdapters } from '@/lib/tool-page/evidence-bullet-adapters';
import { countEligibleEvidenceDomains } from '@/lib/tool-page/evidence-policy';
import {
  deriveToolPageSourceEvidenceDomains,
  type ToolPageReviewSourceLike,
} from '@/lib/tool-page/review-content';

interface BuildToolPagePrepStateInput {
  reviewSources: ToolPageReviewSourceLike[];
  isEligibleEvidenceUrl: (value: unknown) => boolean;
  tool: { slug?: string | null; metadata?: unknown; item_category_links?: unknown };
  orderedAlternatives: Array<{
    slug?: string | null;
    metadata?: unknown;
    item_category_links?: unknown;
  }>;
}

export function buildToolPagePrepState(input: BuildToolPagePrepStateInput): {
  sourceEvidenceDomains: Set<string>;
  eligibleSignalEvidenceCount: number;
  hasEligibleNegativeEvidence: boolean;
  toEvidenceBullet: ReturnType<typeof createToolPageEvidenceBulletAdapters>['toEvidenceBullet'];
  buildEvidenceBulletV2: ReturnType<
    typeof createToolPageEvidenceBulletAdapters
  >['buildEvidenceBulletV2'];
  alternativesState: ReturnType<typeof buildToolPageAlternativesRuntimeFromItems>;
  alternativesViewFields: ReturnType<typeof buildToolPageAlternativesViewFields>;
  comparableAlternatives: ReturnType<
    typeof buildToolPageAlternativesViewFields
  >['comparableAlternatives'];
  hasComparableAlternatives: boolean;
  canCompareByAlternativeSlug: ReturnType<
    typeof buildToolPageAlternativesViewFields
  >['canCompareByAlternativeSlug'];
} {
  const sourceEvidenceDomains = deriveToolPageSourceEvidenceDomains(input.reviewSources);
  const eligibleSignalEvidenceCount = countEligibleEvidenceDomains(sourceEvidenceDomains);
  const hasEligibleNegativeEvidence = eligibleSignalEvidenceCount >= 2;
  const { toEvidenceBullet, buildEvidenceBulletV2 } = createToolPageEvidenceBulletAdapters({
    isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
  });
  const alternativesState = buildToolPageAlternativesRuntimeFromItems(
    input.tool,
    input.orderedAlternatives
  );
  const alternativesViewFields = buildToolPageAlternativesViewFields(alternativesState);
  const { comparableAlternatives, hasComparableAlternatives, canCompareByAlternativeSlug } =
    alternativesViewFields;

  return {
    sourceEvidenceDomains,
    eligibleSignalEvidenceCount,
    hasEligibleNegativeEvidence,
    toEvidenceBullet,
    buildEvidenceBulletV2,
    alternativesState,
    alternativesViewFields,
    comparableAlternatives,
    hasComparableAlternatives,
    canCompareByAlternativeSlug,
  };
}
