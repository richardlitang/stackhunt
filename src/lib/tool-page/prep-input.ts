import type { buildToolPagePrepState } from '@/lib/tool-page/prep-state';
import { toToolPageObjectArray, toToolPageReviewSources } from '@/lib/tool-page/route-normalizers';

interface BuildToolPagePrepStateInputFromRouteInput {
  reviewSources: Array<Record<string, unknown>>;
  isEligibleEvidenceUrl: (value: unknown) => boolean;
  tool: { slug?: string | null; metadata?: unknown; item_category_links?: unknown };
  orderedAlternatives: Array<{
    slug?: string | null;
    metadata?: unknown;
    item_category_links?: unknown;
  }> | null;
}

interface BuildToolPagePrepStateInputFromRouteContextInput {
  reviewSources: unknown;
  isEligibleEvidenceUrl: BuildToolPagePrepStateInputFromRouteInput['isEligibleEvidenceUrl'];
  tool: BuildToolPagePrepStateInputFromRouteInput['tool'];
  orderedAlternatives: unknown;
}

export function buildToolPagePrepStateInputFromRoute(
  input: BuildToolPagePrepStateInputFromRouteInput
): Parameters<typeof buildToolPagePrepState>[0] {
  return {
    reviewSources: input.reviewSources,
    isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
    tool: input.tool,
    orderedAlternatives: input.orderedAlternatives || [],
  };
}

export function buildToolPagePrepStateInputFromRouteContext(
  input: BuildToolPagePrepStateInputFromRouteContextInput
): Parameters<typeof buildToolPagePrepState>[0] {
  return buildToolPagePrepStateInputFromRoute({
    reviewSources: toToolPageReviewSources(input.reviewSources),
    isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
    tool: input.tool,
    orderedAlternatives: toToolPageObjectArray(input.orderedAlternatives),
  });
}
