import type { buildToolPagePrepState } from '@/lib/tool-page/route-state/prep-state';

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
