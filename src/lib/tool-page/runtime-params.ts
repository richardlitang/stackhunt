import { getCanonicalUrl } from '@/lib/utils';
import type { BuildToolPageRuntimeInputParams } from '@/lib/tool-page/runtime-input';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import type { ToolPageEvidenceBulletV2 } from '@/lib/tool-page/evidence-bullets';
import type { ToolPageEvidenceGrade } from '@/lib/tool-page/trust';
import { stripToolPageControlChars } from '@/lib/tool-page/text';

export interface BuildToolPageRuntimeParamsInput {
  request: {
    pathname: string;
    searchParams: URLSearchParams;
    activeReviewLens: ReviewLens;
  };
  lens: {
    viewModelInput: BuildToolPageRuntimeInputParams['viewModelInput'];
    contentInput: Omit<BuildToolPageRuntimeInputParams['lensContentInput'], 'enterpriseTradeoffOverride' | 'hardLimitCount'>;
    canonicalHardLimits: Array<{ text: string }>;
  };
  trust: {
    baseEvidenceGrade: ToolPageEvidenceGrade;
    avoidIfBullet: ToolPageEvidenceBulletV2 | null;
    tradeoffCons: ToolPageEvidenceBulletV2[];
    decisionProofPoints: ToolPageEvidenceBulletV2[];
    hasCollectedSources: boolean;
    contentConfidenceLevel: 'low' | 'medium' | 'high';
    hasPricingCheckedProof: boolean;
    pricingCheckedLabel: string | null;
    pricingSourceUrl: string | null;
    specsVerifiedLabel: string | null;
    officialDocsSourceUrl: string | null;
    communityVerifiedLabel: string | null;
    officialPricingSourceUrl: string | null;
  };
  meta: {
    toolName: string;
    toolVerdict: string | null;
    toolMeta: {
      description: string;
      canonical: string;
    };
    gateShouldIndex: boolean;
    isDraftPage: boolean;
    showReviewInProgressBanner: boolean;
    safeDraftDescription: string;
    decisionSnapshotSummary: string;
    renderVerdictSafe: string | null;
    evaluationDepth: string;
    showPricingSection: boolean;
    hasPricingCheckedProof: boolean;
    hasFAQ: boolean;
    faqSchema: unknown | null;
    decisionSnapshotBestWhen: string[];
    decisionSnapshotWatchOuts: string[];
    decisionTradeoffSummary: string;
    introLooksSpecSheet: boolean;
  };
  schemas: {
    tool: BuildToolPageRuntimeInputParams['schemasInput']['tool'];
    primaryOffer: BuildToolPageRuntimeInputParams['schemasInput']['primaryOffer'];
    reviewCount: number;
    faqSchema: unknown | null;
  };
  updateHistory: {
    communityVerifiedLabel: string | null;
    specsVerifiedLabel: string | null;
    pricingCheckedLabel: string | null;
  };
}

export function buildToolPageRuntimeInputParams(
  input: BuildToolPageRuntimeParamsInput
): BuildToolPageRuntimeInputParams {
  const hardLimitCount = input.lens.canonicalHardLimits.length;

  return {
    pathname: input.request.pathname,
    searchParams: input.request.searchParams,
    activeReviewLens: input.request.activeReviewLens,
    viewModelInput: input.lens.viewModelInput,
    lensContentInput: {
      ...input.lens.contentInput,
      enterpriseTradeoffOverride: input.lens.canonicalHardLimits[0]?.text || null,
      hardLimitCount,
    },
    trustInput: {
      baseEvidenceGrade: input.trust.baseEvidenceGrade,
      verificationItems: [
        input.trust.avoidIfBullet,
        ...input.trust.tradeoffCons,
        ...input.trust.decisionProofPoints,
      ],
      hasCollectedSources: input.trust.hasCollectedSources,
      contentConfidenceLevel: input.trust.contentConfidenceLevel,
      hasPricingCheckedProof: input.trust.hasPricingCheckedProof,
      pricingCheckedLabel: input.trust.pricingCheckedLabel,
      pricingSourceUrl: input.trust.pricingSourceUrl,
      specsVerifiedLabel: input.trust.specsVerifiedLabel,
      officialDocsSourceUrl: input.trust.officialDocsSourceUrl,
      communityVerifiedLabel: input.trust.communityVerifiedLabel,
      officialPricingSourceUrl: input.trust.officialPricingSourceUrl,
    },
    qaInput: {
      title: `${input.meta.toolName} Review | StackHunt`,
      h1: `${input.meta.toolName} Review`,
      intro: stripToolPageControlChars(input.meta.decisionSnapshotSummary || ''),
      verdict: stripToolPageControlChars(input.meta.renderVerdictSafe || input.meta.toolVerdict || ''),
      evaluationDepth: input.meta.evaluationDepth === 'Docs-only' ? 'docs_only' : 'hands_on',
      pricingSectionVisible: input.meta.showPricingSection,
      hasPricingCheckedProof: input.meta.hasPricingCheckedProof,
      schemaMatchesVisibleContent: Boolean(!input.meta.hasFAQ || input.meta.faqSchema),
      hasBestForSignal: input.meta.decisionSnapshotBestWhen.length > 0,
      hasNotForSignal: input.meta.decisionSnapshotWatchOuts.length > 0,
      hasTradeoffSignal: input.meta.decisionTradeoffSummary !== 'Tradeoff not confirmed yet.',
      hasDecisionSummaryBlock: true,
      introLooksSpecSheet: input.meta.introLooksSpecSheet,
    },
    indexInput: {
      gateShouldIndex: input.meta.gateShouldIndex,
      isDraftPage: input.meta.isDraftPage,
      showReviewInProgressBanner: input.meta.showReviewInProgressBanner,
      toolCanonicalUrl: input.meta.toolMeta.canonical,
      fallbackCanonicalUrl: getCanonicalUrl('/tools'),
      defaultDescription: input.meta.toolMeta.description,
      draftDescription: input.meta.safeDraftDescription,
    },
    baseMeta: {
      description: input.meta.toolMeta.description,
      canonical: input.meta.toolMeta.canonical,
    },
    schemasInput: {
      tool: input.schemas.tool,
      primaryOffer: input.schemas.primaryOffer,
      reviewCount: input.schemas.reviewCount,
      faqSchema: input.schemas.faqSchema,
    },
    updateHistoryLabelsInput: {
      communityVerifiedLabel: input.updateHistory.communityVerifiedLabel,
      specsVerifiedLabel: input.updateHistory.specsVerifiedLabel,
      pricingCheckedLabel: input.updateHistory.pricingCheckedLabel,
    },
  };
}
