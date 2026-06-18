import type { ToolPageReviewContextSignals } from '@/lib/tool-page/evidence/review-context';
import type { BuildToolPageDecisionRuntimeInput } from '@/lib/tool-page/decision/decision-runtime';

interface BuildToolPageDecisionRuntimeInputContext {
  tool: {
    name: string;
    short_description: string | null;
    long_description: string | null;
    pricing_type: string | null;
    verdict: string | null;
    website: string | null;
    category?: { slug?: string | null } | null;
  };
  knowledgeCard: Record<string, unknown> | null;
  setupTracks: unknown;
  firstReviewSummaryMarkdown: string | null;
  reviewPros: unknown[];
  reviewCons: unknown[];
  audiences: Array<{ name: string }>;
  reviewContextSignals: ToolPageReviewContextSignals;
  sectionStatus: {
    pricing: BuildToolPageDecisionRuntimeInput['sectionStatus']['pricing'];
    verdict: BuildToolPageDecisionRuntimeInput['sectionStatus']['verdict'];
  };
  globalCons: unknown[];
  hasEligibleNegativeEvidence: boolean;
  renderVerdict: string | null;
}

export function buildToolPageDecisionRuntimeInput(
  input: BuildToolPageDecisionRuntimeInputContext
): BuildToolPageDecisionRuntimeInput {
  return {
    tool: {
      name: input.tool.name,
      short_description: input.tool.short_description,
      long_description: input.tool.long_description,
      pricing_type: input.tool.pricing_type,
      verdict: input.tool.verdict,
      website: input.tool.website,
      category: { slug: input.tool.category?.slug || null },
    },
    knowledgeCard: input.knowledgeCard,
    setupTracks: input.setupTracks || null,
    review: {
      summary_markdown: input.firstReviewSummaryMarkdown,
      pros: input.reviewPros,
      cons: input.reviewCons,
    },
    tags: {
      audiences: input.audiences,
    },
    reviewContextSignals: {
      humanVerdict: input.reviewContextSignals.humanVerdict || null,
      decisionSlotsRaw: input.reviewContextSignals.decisionSlotsRaw,
      decisionIntroRaw: input.reviewContextSignals.decisionIntroRaw,
      idealFor: input.reviewContextSignals.idealFor,
      avoidIf: input.reviewContextSignals.avoidIf,
    },
    sectionStatus: {
      pricing: input.sectionStatus.pricing,
      verdict: input.sectionStatus.verdict,
    },
    globalCons: input.globalCons,
    hasEligibleNegativeEvidence: input.hasEligibleNegativeEvidence,
    renderVerdict: input.renderVerdict,
  };
}
