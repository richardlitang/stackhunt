import { getAlternatives } from '@/lib/analysis/alternatives';
import { computeMicroDiffs } from '@/lib/analysis/micro-diff';
import { getToolPageItemBySlug, getToolTags, supabase } from '@/lib/supabase';
import { deriveToolPageCoreState } from '@/lib/tool-page/core-state';
import {
  fetchToolPageCuratedVerdictEntries,
  type ToolPageCuratedVerdictEntry,
} from '@/lib/tool-page/curated-verdicts';
import { orderToolPageAlternativesByIds } from '@/lib/tool-page/alternatives-order';
import {
  deriveToolPageReviewContentLists,
  type ToolPageReviewContentLike,
} from '@/lib/tool-page/review-content';
import {
  mapLaneSubjectProfileToResolvedSubject,
  resolveToolPageCanonicalSubject,
  resolveToolPageReviewSubject,
  shouldUseSubjectMatchedReview,
  scoreToolPageReviewSubjectMatch,
  type ToolPageResolvedSubject,
} from '@/lib/tool-page/review-subject';
import { readToolPageLaneOutputs, type ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';
import { selectToolPageReview } from '@/lib/reviews/select-review';
import type { Tool } from '@/types/database';

type ToolPageTool = Awaited<ReturnType<typeof getToolBySlugAndType>>;
type ToolPageTags = Awaited<ReturnType<typeof getToolTags>>;
type ToolPageMicroDiffs = ReturnType<typeof computeMicroDiffs>;

interface ToolPageAlternative {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  short_description: string | null;
  avg_score: number | null;
  pricing_type: string | null;
  learning_curve: string | null;
  base_score: number | null;
  specs: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  item_category_links: unknown;
}

interface ToolPageParentTool {
  id: string;
  name: string;
  slug: string;
}

export interface ToolPageData {
  tool: ToolPageTool;
  parentTool: ToolPageParentTool | null;
  resolvedSubject: ToolPageResolvedSubject;
  laneOutputs: ToolPageLaneOutputs | null;
  subjectSelectionSuppressed: boolean;
  subjectSelectionReason: string | null;
  tags: ToolPageTags;
  primaryOffer: ToolPageTool extends { affiliate_offers?: infer T }
    ? T extends Array<infer U>
      ? U | null
      : null
    : null;
  reviewSelection: ReturnType<typeof selectToolPageReview>;
  firstReview: ReturnType<typeof selectToolPageReview>['firstPublished'];
  reviewContentLists: ReturnType<typeof deriveToolPageReviewContentLists>;
  coreState: ReturnType<typeof deriveToolPageCoreState>;
  orderedAlternatives: ToolPageAlternative[];
  alternativesLabel: 'Alternatives' | 'Related Tools';
  microDiffs: ToolPageMicroDiffs;
  curatedVerdictEntries: Map<string, ToolPageCuratedVerdictEntry>;
}

export async function getToolPageData(slug: string): Promise<ToolPageData | null> {
  const tool = await getToolPageItemBySlug(slug);
  if (!tool) return null;

  let parentTool: ToolPageParentTool | null = null;
  if (tool.parent_id) {
    const { data } = await supabase
      .from('items')
      .select('id, name, slug')
      .eq('id', tool.parent_id)
      .single();
    if (data) {
      parentTool = data;
    }
  }

  const tags = await getToolTags(tool.id);
  let primaryOffer: ToolPageData['primaryOffer'] = null;
  if (Array.isArray(tool.affiliate_offers) && tool.affiliate_offers.length > 0) {
    const primary = tool.affiliate_offers.find(
      (offer: unknown): offer is NonNullable<ToolPageData['primaryOffer']> =>
        Boolean(
          offer &&
          typeof offer === 'object' &&
          (offer as { is_primary?: unknown }).is_primary === true
        )
    );
    primaryOffer = primary || tool.affiliate_offers[0] || null;
  }
  const reviews = Array.isArray(tool.reviews) ? tool.reviews : [];
  const laneOutputs = readToolPageLaneOutputs(tool as Tool);
  const laneSubject = mapLaneSubjectProfileToResolvedSubject(laneOutputs, {
    name: tool.name,
    slug: tool.slug,
  });
  const heuristicSubject = resolveToolPageReviewSubject({
    tool: {
      name: tool.name,
      slug: tool.slug,
    },
    parentTool,
  });
  const resolvedSubject = resolveToolPageCanonicalSubject({
    laneSubject,
    heuristicSubject,
  });
  const reviewSelection = selectToolPageReview(reviews, {
    getReviewScore: (review) => scoreToolPageReviewSubjectMatch(review, resolvedSubject),
  });
  const shouldUsePublishedReview = shouldUseSubjectMatchedReview({
    subject: resolvedSubject,
    publishedReviewScore: reviewSelection.publishedReviewScore,
  });
  const effectiveReviewSelection = shouldUsePublishedReview
    ? reviewSelection
    : {
        ...reviewSelection,
        firstPublished: null,
        hasPublishedReview: false,
        hasNewerUnpublishedThanPublished: false,
        publishedReviewScore: null,
      };
  const subjectSelectionSuppressed =
    !shouldUsePublishedReview && reviewSelection.hasPublishedReview;
  const subjectSelectionReason = subjectSelectionSuppressed
    ? resolvedSubject.ambiguityReason ||
      'Published review content is hidden until this page resolves a single review subject.'
    : null;
  const firstReview = effectiveReviewSelection.firstPublished;
  const reviewContentLists = deriveToolPageReviewContentLists(
    firstReview as ToolPageReviewContentLike | null
  );
  const coreState = deriveToolPageCoreState({
    tool,
    hasNewerUnpublishedReview: effectiveReviewSelection.hasNewerUnpublishedThanPublished,
  });

  const alternativesResponse = await getAlternatives(tool, { matchThreshold: 0.4, matchCount: 6 });
  const alternativeIds = alternativesResponse.items.map((item) => item.id);

  const { data: alternatives } =
    alternativeIds.length > 0
      ? await supabase
          .from('items')
          .select(
            `
          id, name, slug, logo_url, short_description, avg_score, pricing_type, learning_curve,
          base_score, specs, metadata,
          item_category_links(
            relevance_score,
            category:categories(id, slug, name)
          )
        `
          )
          .in('id', alternativeIds)
          .eq('type', 'tool')
      : { data: [] };

  const orderedAlternatives = orderToolPageAlternativesByIds(
    (alternatives || []) as ToolPageAlternative[],
    alternativeIds
  );
  const alternativesLabel =
    alternativesResponse.type === 'alternatives' ? 'Alternatives' : 'Related Tools';

  const microDiffs = orderedAlternatives.length
    ? computeMicroDiffs(
        {
          slug: tool.slug,
          name: tool.name,
          pricing_type: tool.pricing_type || '',
          learning_curve: tool.learning_curve,
          base_score: tool.base_score,
          specs: tool.specs,
        },
        orderedAlternatives.map((alt) => ({
          slug: alt.slug,
          name: alt.name,
          pricing_type: alt.pricing_type || '',
          learning_curve: alt.learning_curve,
          base_score: alt.base_score,
          specs: alt.specs,
        }))
      )
    : new Map();

  const altSlugs = orderedAlternatives.map((item) => item.slug);
  const curatedVerdictEntries = await fetchToolPageCuratedVerdictEntries(tool.slug, altSlugs);

  return {
    tool,
    parentTool,
    resolvedSubject,
    laneOutputs,
    subjectSelectionSuppressed,
    subjectSelectionReason,
    tags,
    primaryOffer,
    reviewSelection: effectiveReviewSelection,
    firstReview,
    reviewContentLists,
    coreState,
    orderedAlternatives,
    alternativesLabel,
    microDiffs,
    curatedVerdictEntries,
  };
}
