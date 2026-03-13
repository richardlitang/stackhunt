import { buildToolPageAlternativesPricingStateInputFromRoute } from '@/lib/tool-page/alternatives-pricing-input';
import { buildToolPageAlternativesPricingState } from '@/lib/tool-page/alternatives-pricing-state';
import { buildToolPageChromeStateInputFromRoute } from '@/lib/tool-page/chrome-input';
import { buildToolPageContentSectionsStateInputFromRoute } from '@/lib/tool-page/content-sections-input';
import { buildToolPageContentSectionsState } from '@/lib/tool-page/content-sections-state';
import { buildToolPageLensViewFields } from '@/lib/tool-page/lens-view-fields';
import { buildToolPageChromeState } from '@/lib/tool-page/page-chrome-state';
import {
  toToolPageComparableAlternatives,
  toToolPageObjectArray,
  toToolPageOrderedAlternatives,
  toToolPageSpecsRecord,
} from '@/lib/tool-page/route-normalizers';

interface BuildToolPageChromeStateInputFromRouteDataInput {
  toolCategory: Parameters<typeof buildToolPageChromeStateInputFromRoute>[0]['toolCategory'];
  hasCollectedSources: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['hasCollectedSources'];
  evaluationDepth: Parameters<typeof buildToolPageChromeStateInputFromRoute>[0]['evaluationDepth'];
  collectedSourcesTotal: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['collectedSourcesTotal'];
  trustConfidenceLabel: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['trustConfidenceLabel'];
  pendingVerificationCount: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['pendingVerificationCount'];
  communityCorroborationCount: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['communityCorroborationCount'];
  userSignalCoveragePending?: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['userSignalCoveragePending'];
  userSignalNeedsConfirmationCount?: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['userSignalNeedsConfirmationCount'];
  userSignalChannelCoverageCount?: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['userSignalChannelCoverageCount'];
  communityVerifiedLabel: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['communityVerifiedLabel'];
  specsVerifiedLabel: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['specsVerifiedLabel'];
  pricingCheckedLabel: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['pricingCheckedLabel'];
  pricingVerifiedLabel: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['pricingVerifiedLabel'];
  trustStatus: Parameters<typeof buildToolPageChromeStateInputFromRoute>[0]['trustStatus'];
  activeReviewLens: Parameters<
    typeof buildToolPageChromeStateInputFromRoute
  >[0]['activeReviewLens'];
  lensLabelMap: Parameters<typeof buildToolPageChromeStateInputFromRoute>[0]['lensLabelMap'];
  tool: {
    website: string | null;
  };
  websiteHostLabel: string | null;
}

function buildToolPageChromeStateInputFromRouteData(
  input: BuildToolPageChromeStateInputFromRouteDataInput
): Parameters<typeof buildToolPageChromeState>[0] {
  return buildToolPageChromeStateInputFromRoute({
    toolCategory: input.toolCategory,
    hasCollectedSources: input.hasCollectedSources,
    evaluationDepth: input.evaluationDepth,
    collectedSourcesTotal: input.collectedSourcesTotal,
    trustConfidenceLabel: input.trustConfidenceLabel,
    pendingVerificationCount: input.pendingVerificationCount,
    communityCorroborationCount: input.communityCorroborationCount || 0,
    userSignalCoveragePending: input.userSignalCoveragePending || false,
    userSignalNeedsConfirmationCount: input.userSignalNeedsConfirmationCount || 0,
    userSignalChannelCoverageCount: input.userSignalChannelCoverageCount || 0,
    communityVerifiedLabel: input.communityVerifiedLabel,
    specsVerifiedLabel: input.specsVerifiedLabel,
    pricingCheckedLabel: input.pricingCheckedLabel,
    pricingVerifiedLabel: input.pricingVerifiedLabel,
    trustStatus: input.trustStatus,
    website: input.tool.website || null,
    websiteHostLabel: input.websiteHostLabel,
    activeReviewLens: input.activeReviewLens,
    lensLabelMap: input.lensLabelMap,
  });
}

interface BuildToolPageAlternativesPricingStateInputFromRouteContextInput {
  activeReviewLens: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRoute
  >[0]['activeReviewLens'];
  budgetCostDrivers: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRoute
  >[0]['budgetCostDrivers'];
  budgetOneTimeFees: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRoute
  >[0]['budgetOneTimeFees'];
  budgetCommitmentTerms: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRoute
  >[0]['budgetCommitmentTerms'];
  budgetRoiThreshold: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRoute
  >[0]['budgetRoiThreshold'];
  alternativesLabel: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRoute
  >[0]['alternativesLabel'];
  category: Parameters<typeof buildToolPageAlternativesPricingStateInputFromRoute>[0]['category'];
  comparableAlternatives: unknown;
  orderedAlternatives: unknown;
  canCompareByAlternativeSlug: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRoute
  >[0]['canCompareByAlternativeSlug'];
  tool: {
    slug: string;
    specs: unknown;
  };
}

function buildToolPageAlternativesPricingStateInputFromRouteContext(
  input: BuildToolPageAlternativesPricingStateInputFromRouteContextInput
): Parameters<typeof buildToolPageAlternativesPricingState>[0] {
  return buildToolPageAlternativesPricingStateInputFromRoute({
    activeReviewLens: input.activeReviewLens,
    budgetCostDrivers: input.budgetCostDrivers,
    budgetOneTimeFees: input.budgetOneTimeFees,
    budgetCommitmentTerms: input.budgetCommitmentTerms,
    budgetRoiThreshold: input.budgetRoiThreshold,
    toolSpecs: toToolPageSpecsRecord(input.tool.specs),
    alternativesLabel: input.alternativesLabel,
    categoryName: input.category?.name || null,
    toolSlug: input.tool.slug,
    comparableAlternatives: toToolPageComparableAlternatives(input.comparableAlternatives),
    category: input.category,
    orderedAlternatives: toToolPageOrderedAlternatives(input.orderedAlternatives),
    canCompareByAlternativeSlug: input.canCompareByAlternativeSlug,
  });
}

interface BuildToolPageContentSectionsStateInputFromRouteContextInput {
  evidenceLinks: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['evidenceLinks'];
  lowConfidenceEvidenceLinks: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['lowConfidenceEvidenceLinks'];
  effectiveEvidencePros: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['effectiveEvidencePros'];
  effectiveEvidenceCons: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['effectiveEvidenceCons'];
  userReportedPros: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['userReportedPros'];
  userReportedCons: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['userReportedCons'];
  laneOutputs?: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['laneOutputs'];
  knowledgeCard: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['knowledgeCard'];
  setupTracks: Parameters<typeof buildToolPageContentSectionsStateInputFromRoute>[0]['setupTracks'];
  gettingStartedCtaUrl: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['gettingStartedCtaUrl'];
  prosConsSourcesCount: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['prosConsSourcesCount'];
  communityCorroborationCount: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['communityCorroborationCount'];
  userSignalClaimsCount?: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['userSignalClaimsCount'];
  evidenceBasis: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['evidenceBasis'];
  hasCommunity: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['hasCommunity'];
  userAdvocate: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['userAdvocate'];
  guardedHumanVerdict: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['guardedHumanVerdict'];
  vibe: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['vibe'];
  originStory: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['originStory'];
  idealFor: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['idealFor'];
  guardedAvoidIf: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['guardedAvoidIf'];
  powerTip: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['powerTip'];
  delighters: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['delighters'];
  frustrations: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['tribalKnowledge']['frustrations'];
  displayCategorySpecificData: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['displayCategorySpecificData'];
  vipSpecifics: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['vipSpecifics'];
  categoryName: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['categoryName'];
  specsVerifiedLabel: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['specsVerifiedLabel'];
  pricingCheckedLabel: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['pricingCheckedLabel'];
  hasOfficialPricingSource: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['hasOfficialPricingSource'];
  pricingEvidenceCount: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['pricingEvidenceCount'];
  hasSecurity: Parameters<typeof buildToolPageContentSectionsStateInputFromRoute>[0]['hasSecurity'];
  hasPortability: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['hasPortability'];
  hasParentTool: Parameters<
    typeof buildToolPageContentSectionsStateInputFromRoute
  >[0]['hasParentTool'];
  tool: {
    name: string;
    website: string | null;
    long_description: string | null;
    affiliate_offers:
      | Parameters<typeof buildToolPageContentSectionsStateInputFromRoute>[0]['affiliateOffers']
      | undefined;
  };
}

function buildToolPageContentSectionsStateInputFromRouteContext(
  input: BuildToolPageContentSectionsStateInputFromRouteContextInput
): Parameters<typeof buildToolPageContentSectionsState>[0] {
  return buildToolPageContentSectionsStateInputFromRoute({
    evidenceLinks: input.evidenceLinks,
    lowConfidenceEvidenceLinks: input.lowConfidenceEvidenceLinks,
    effectiveEvidencePros: input.effectiveEvidencePros,
    effectiveEvidenceCons: input.effectiveEvidenceCons,
    userReportedPros: input.userReportedPros,
    userReportedCons: input.userReportedCons,
    laneOutputs: input.laneOutputs,
    knowledgeCard: input.knowledgeCard,
    fallbackWebsiteUrl: input.tool.website || null,
    setupTracks: input.setupTracks,
    gettingStartedCtaUrl: input.gettingStartedCtaUrl,
    toolName: input.tool.name,
    prosConsSourcesCount: input.prosConsSourcesCount,
    communityCorroborationCount: input.communityCorroborationCount || 0,
    userSignalClaimsCount: input.userSignalClaimsCount || 0,
    affiliateOffers: input.tool.affiliate_offers || [],
    evidenceBasis: input.evidenceBasis,
    tribalKnowledge: {
      hasCommunity: input.hasCommunity,
      userAdvocate: input.userAdvocate,
      guardedHumanVerdict: input.guardedHumanVerdict,
      vibe: input.vibe,
      originStory: input.originStory,
      idealFor: input.idealFor,
      guardedAvoidIf: input.guardedAvoidIf,
      powerTip: input.powerTip,
      delighters: input.delighters,
      frustrations: input.frustrations,
    },
    displayCategorySpecificData: input.displayCategorySpecificData,
    vipSpecifics: input.vipSpecifics,
    categoryName: input.categoryName,
    specsVerifiedLabel: input.specsVerifiedLabel,
    longDescription: input.tool.long_description,
    pricingCheckedLabel: input.pricingCheckedLabel,
    hasOfficialPricingSource: input.hasOfficialPricingSource,
    pricingEvidenceCount: input.pricingEvidenceCount,
    hasSecurity: input.hasSecurity,
    hasPortability: input.hasPortability,
    hasParentTool: input.hasParentTool,
  });
}

interface BuildToolPageChromeRouteStateFromDecisionContextInput {
  chromeLens: {
    lensRuntime: Parameters<typeof buildToolPageLensViewFields>[0];
    activeReviewLens: Parameters<
      typeof buildToolPageChromeStateInputFromRouteData
    >[0]['activeReviewLens'];
    toolCategory: Parameters<
      typeof buildToolPageChromeStateInputFromRouteData
    >[0]['toolCategory'];
    tool: Parameters<typeof buildToolPageChromeStateInputFromRouteData>[0]['tool'];
    websiteHostLabel: Parameters<
      typeof buildToolPageChromeStateInputFromRouteData
    >[0]['websiteHostLabel'];
    runtimeViewBundle: {
      trustConfidenceLabel: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['trustConfidenceLabel'];
      pendingVerificationCount: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['pendingVerificationCount'];
      trustStatus: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['trustStatus'];
      lensLabelMap: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['lensLabelMap'];
    };
    evidenceRuntime: {
      hasCollectedSources: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['hasCollectedSources'];
      collectedSourcesTotal: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['collectedSourcesTotal'];
      pricingCheckedLabel: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['pricingCheckedLabel'];
    };
    reviewSignalsView: {
      communityVerifiedLabel: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['communityVerifiedLabel'];
      specsVerifiedLabel: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['specsVerifiedLabel'];
      pricingVerifiedLabel: Parameters<
        typeof buildToolPageChromeStateInputFromRouteData
      >[0]['pricingVerifiedLabel'];
    };
    evaluationDepth: Parameters<
      typeof buildToolPageChromeStateInputFromRouteData
    >[0]['evaluationDepth'];
    qualityState: {
      communityCorroborationCount: number;
      userSignalCoveragePending?: boolean;
      userSignalNeedsConfirmationCount?: number;
      userSignalChannelCoverageCount?: number;
    };
  };
  contentAlternatives: {
    activeReviewLens: Parameters<
      typeof buildToolPageAlternativesPricingStateInputFromRouteContext
    >[0]['activeReviewLens'];
    alternativesLabel: Parameters<
      typeof buildToolPageAlternativesPricingStateInputFromRouteContext
    >[0]['alternativesLabel'];
    toolCategoryRef: Parameters<
      typeof buildToolPageAlternativesPricingStateInputFromRouteContext
    >[0]['category'];
    orderedAlternatives: Parameters<
      typeof buildToolPageAlternativesPricingStateInputFromRouteContext
    >[0]['orderedAlternatives'];
    comparableAlternatives: Parameters<
      typeof buildToolPageAlternativesPricingStateInputFromRouteContext
    >[0]['comparableAlternatives'];
    canCompareByAlternativeSlug: Parameters<
      typeof buildToolPageAlternativesPricingStateInputFromRouteContext
    >[0]['canCompareByAlternativeSlug'];
    tool: {
      name: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['tool']['name'];
      slug: Parameters<
        typeof buildToolPageAlternativesPricingStateInputFromRouteContext
      >[0]['tool']['slug'];
      specs: Parameters<
        typeof buildToolPageAlternativesPricingStateInputFromRouteContext
      >[0]['tool']['specs'];
      website: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['tool']['website'];
      long_description: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['tool']['long_description'];
      affiliate_offers: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['tool']['affiliate_offers'];
    };
    knowledgeCard: Parameters<
      typeof buildToolPageContentSectionsStateInputFromRouteContext
    >[0]['knowledgeCard'];
    parentTool: unknown;
    setupTracks: unknown;
    displayCategorySpecificData: Parameters<
      typeof buildToolPageContentSectionsStateInputFromRouteContext
    >[0]['displayCategorySpecificData'];
    vipSpecifics: Parameters<
      typeof buildToolPageContentSectionsStateInputFromRouteContext
    >[0]['vipSpecifics'];
    userReportedPros: Parameters<
      typeof buildToolPageContentSectionsStateInputFromRouteContext
    >[0]['userReportedPros'];
    userReportedCons: Parameters<
      typeof buildToolPageContentSectionsStateInputFromRouteContext
    >[0]['userReportedCons'];
    laneOutputs?: Parameters<
      typeof buildToolPageContentSectionsStateInputFromRouteContext
    >[0]['laneOutputs'];
    decisionRuntime: {
      setupSignals: {
        gettingStartedCtaUrl: Parameters<
          typeof buildToolPageContentSectionsStateInputFromRouteContext
        >[0]['gettingStartedCtaUrl'];
      };
      guardedHumanVerdict: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['guardedHumanVerdict'];
      guardedAvoidIf: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['guardedAvoidIf'];
    };
    sectionFlags: {
      hasCommunity: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['hasCommunity'];
      hasSecurity: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['hasSecurity'];
      hasPortability: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['hasPortability'];
    };
    evidenceRuntime: {
      effectiveEvidencePros: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['effectiveEvidencePros'];
      effectiveEvidenceCons: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['effectiveEvidenceCons'];
      collectedSourcesBySection: {
        pros_cons: Parameters<
          typeof buildToolPageContentSectionsStateInputFromRouteContext
        >[0]['prosConsSourcesCount'];
      };
      pricingCheckedLabel: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['pricingCheckedLabel'];
      officialPricingSource: { url?: string | null } | null;
      pricingEvidenceLinks: Array<unknown>;
    };
    reviewArtifactsState: {
      evidenceLinks: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['evidenceLinks'];
      lowConfidenceEvidenceLinks: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['lowConfidenceEvidenceLinks'];
      evidenceBasis: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['evidenceBasis'];
    };
    reviewSignalsView: {
      specsVerifiedLabel: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['specsVerifiedLabel'];
    };
    reviewContextSignals: {
      budgetCostDrivers: Parameters<
        typeof buildToolPageAlternativesPricingStateInputFromRouteContext
      >[0]['budgetCostDrivers'];
      budgetOneTimeFees: Parameters<
        typeof buildToolPageAlternativesPricingStateInputFromRouteContext
      >[0]['budgetOneTimeFees'];
      budgetCommitmentTerms: Parameters<
        typeof buildToolPageAlternativesPricingStateInputFromRouteContext
      >[0]['budgetCommitmentTerms'];
      budgetRoiThreshold: Parameters<
        typeof buildToolPageAlternativesPricingStateInputFromRouteContext
      >[0]['budgetRoiThreshold'];
      userAdvocate: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['userAdvocate'];
      vibe: Parameters<typeof buildToolPageContentSectionsStateInputFromRouteContext>[0]['vibe'];
      originStory: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['originStory'];
      idealFor: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['idealFor'];
      powerTip: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['powerTip'];
      delighters: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['delighters'];
      frustrations: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['frustrations'];
    };
    qualityState: {
      communityCorroborationCount: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['communityCorroborationCount'];
      userSignalClaimsCount?: Parameters<
        typeof buildToolPageContentSectionsStateInputFromRouteContext
      >[0]['userSignalClaimsCount'];
    };
  };
}

export function buildToolPageChromeRouteStateFromDecisionContext(
  input: BuildToolPageChromeRouteStateFromDecisionContextInput
) {
  const lensViewFields = buildToolPageLensViewFields(input.chromeLens.lensRuntime);
  const toolChromeState = buildToolPageChromeState(
    buildToolPageChromeStateInputFromRouteData({
      toolCategory: input.chromeLens.toolCategory,
      hasCollectedSources: input.chromeLens.evidenceRuntime.hasCollectedSources,
      evaluationDepth: input.chromeLens.evaluationDepth,
      collectedSourcesTotal: input.chromeLens.evidenceRuntime.collectedSourcesTotal,
      trustConfidenceLabel: input.chromeLens.runtimeViewBundle.trustConfidenceLabel,
      pendingVerificationCount: input.chromeLens.runtimeViewBundle.pendingVerificationCount,
      communityCorroborationCount: input.chromeLens.qualityState.communityCorroborationCount,
      userSignalCoveragePending: input.chromeLens.qualityState.userSignalCoveragePending || false,
      userSignalNeedsConfirmationCount:
        input.chromeLens.qualityState.userSignalNeedsConfirmationCount || 0,
      userSignalChannelCoverageCount:
        input.chromeLens.qualityState.userSignalChannelCoverageCount || 0,
      communityVerifiedLabel: input.chromeLens.reviewSignalsView.communityVerifiedLabel,
      specsVerifiedLabel: input.chromeLens.reviewSignalsView.specsVerifiedLabel,
      pricingCheckedLabel: input.chromeLens.evidenceRuntime.pricingCheckedLabel,
      pricingVerifiedLabel: input.chromeLens.reviewSignalsView.pricingVerifiedLabel,
      trustStatus: input.chromeLens.runtimeViewBundle.trustStatus,
      activeReviewLens: input.chromeLens.activeReviewLens,
      lensLabelMap: input.chromeLens.runtimeViewBundle.lensLabelMap,
      tool: input.chromeLens.tool,
      websiteHostLabel: input.chromeLens.websiteHostLabel,
    })
  );
  const alternativesPricingState = buildToolPageAlternativesPricingState(
    buildToolPageAlternativesPricingStateInputFromRouteContext({
      activeReviewLens: input.contentAlternatives.activeReviewLens,
      budgetCostDrivers: input.contentAlternatives.reviewContextSignals.budgetCostDrivers,
      budgetOneTimeFees: input.contentAlternatives.reviewContextSignals.budgetOneTimeFees,
      budgetCommitmentTerms: input.contentAlternatives.reviewContextSignals.budgetCommitmentTerms,
      budgetRoiThreshold: input.contentAlternatives.reviewContextSignals.budgetRoiThreshold,
      alternativesLabel: input.contentAlternatives.alternativesLabel,
      category: input.contentAlternatives.toolCategoryRef,
      comparableAlternatives: input.contentAlternatives.comparableAlternatives,
      orderedAlternatives: input.contentAlternatives.orderedAlternatives,
      canCompareByAlternativeSlug: input.contentAlternatives.canCompareByAlternativeSlug,
      tool: {
        slug: input.contentAlternatives.tool.slug,
        specs: input.contentAlternatives.tool.specs,
      },
    })
  );
  const contentSectionsState = buildToolPageContentSectionsState(
    buildToolPageContentSectionsStateInputFromRouteContext({
      evidenceLinks: input.contentAlternatives.reviewArtifactsState.evidenceLinks,
      lowConfidenceEvidenceLinks:
        input.contentAlternatives.reviewArtifactsState.lowConfidenceEvidenceLinks,
      effectiveEvidencePros: input.contentAlternatives.evidenceRuntime.effectiveEvidencePros,
      effectiveEvidenceCons: input.contentAlternatives.evidenceRuntime.effectiveEvidenceCons,
      userReportedPros: input.contentAlternatives.userReportedPros,
      userReportedCons: input.contentAlternatives.userReportedCons,
      laneOutputs: input.contentAlternatives.laneOutputs,
      knowledgeCard: input.contentAlternatives.knowledgeCard,
      setupTracks: toToolPageObjectArray(input.contentAlternatives.setupTracks),
      gettingStartedCtaUrl:
        input.contentAlternatives.decisionRuntime.setupSignals.gettingStartedCtaUrl,
      prosConsSourcesCount:
        input.contentAlternatives.evidenceRuntime.collectedSourcesBySection.pros_cons,
      communityCorroborationCount:
        input.contentAlternatives.qualityState.communityCorroborationCount,
      userSignalClaimsCount: input.contentAlternatives.qualityState.userSignalClaimsCount,
      evidenceBasis: input.contentAlternatives.reviewArtifactsState.evidenceBasis,
      hasCommunity: input.contentAlternatives.sectionFlags.hasCommunity,
      userAdvocate: input.contentAlternatives.reviewContextSignals.userAdvocate,
      guardedHumanVerdict: input.contentAlternatives.decisionRuntime.guardedHumanVerdict,
      vibe: input.contentAlternatives.reviewContextSignals.vibe,
      originStory: input.contentAlternatives.reviewContextSignals.originStory,
      idealFor: input.contentAlternatives.reviewContextSignals.idealFor,
      guardedAvoidIf: input.contentAlternatives.decisionRuntime.guardedAvoidIf,
      powerTip: input.contentAlternatives.reviewContextSignals.powerTip,
      delighters: input.contentAlternatives.reviewContextSignals.delighters,
      frustrations: input.contentAlternatives.reviewContextSignals.frustrations,
      displayCategorySpecificData: input.contentAlternatives.displayCategorySpecificData,
      vipSpecifics: input.contentAlternatives.vipSpecifics,
      categoryName: input.contentAlternatives.toolCategoryRef?.name || null,
      specsVerifiedLabel: input.contentAlternatives.reviewSignalsView.specsVerifiedLabel,
      pricingCheckedLabel: input.contentAlternatives.evidenceRuntime.pricingCheckedLabel,
      hasOfficialPricingSource: Boolean(
        input.contentAlternatives.evidenceRuntime.officialPricingSource
      ),
      pricingEvidenceCount: input.contentAlternatives.evidenceRuntime.pricingEvidenceLinks.length,
      hasSecurity: input.contentAlternatives.sectionFlags.hasSecurity,
      hasPortability: input.contentAlternatives.sectionFlags.hasPortability,
      hasParentTool: Boolean(input.contentAlternatives.parentTool),
      tool: {
        name: input.contentAlternatives.tool.name,
        website: input.contentAlternatives.tool.website,
        long_description: input.contentAlternatives.tool.long_description,
        affiliate_offers: input.contentAlternatives.tool.affiliate_offers,
      },
    })
  );
  const {
    lensHrefs,
    focusSwitchOptions,
    lensDefaultFocus,
    showFocusSwitch,
    lensPriorityLinks,
    verdictLabelRationale,
    reviewDek,
    readerFocusNote,
    lensBestFitLine,
    lensWeakFitLine,
    lensTradeoffLine,
    scoreDrivers,
    workflowFitHighlights,
    workflowFitCards,
  } = lensViewFields;
  const {
    reviewInProgressBannerText,
    researchStatusView,
    categoryBreadcrumb,
    trustBarProps,
    verificationBadgeLabel,
    websiteState,
    websiteDisplayLabel,
    lensPriorityLead,
    freshnessLabels,
  } = toolChromeState;
  const {
    pricingInsightsBudgetAnalyst,
    alternativesIntroText,
    compareTeaserLinks,
    alternativesSectionState,
    alternativeCardsView,
  } = alternativesPricingState;
  const {
    sourceListsView,
    prosConsView,
    gettingStartedProps,
    strengthsSubtitle,
    affiliateOffersView,
    evidenceBasisChips,
    tribalKnowledgeProps,
    platformSectionState,
    specsProps,
    specsSectionState,
    aboutContent,
    pricingSectionState,
    pricingEvidenceState,
    pricingNotice,
    operationalDetailsState,
  } = contentSectionsState;

  return {
    lensViewFields,
    lensHrefs,
    focusSwitchOptions,
    lensDefaultFocus,
    showFocusSwitch,
    lensPriorityLinks,
    verdictLabelRationale,
    reviewDek,
    readerFocusNote,
    lensBestFitLine,
    lensWeakFitLine,
    lensTradeoffLine,
    scoreDrivers,
    workflowFitHighlights,
    workflowFitCards,
    toolChromeState,
    reviewInProgressBannerText,
    researchStatusView,
    categoryBreadcrumb,
    trustBarProps,
    verificationBadgeLabel,
    websiteState,
    websiteDisplayLabel,
    lensPriorityLead,
    freshnessLabels,
    alternativesPricingState,
    pricingInsightsBudgetAnalyst,
    alternativesIntroText,
    compareTeaserLinks,
    alternativesSectionState,
    alternativeCardsView,
    contentSectionsState,
    sourceListsView,
    prosConsView,
    gettingStartedProps,
    strengthsSubtitle,
    affiliateOffersView,
    evidenceBasisChips,
    tribalKnowledgeProps,
    platformSectionState,
    specsProps,
    specsSectionState,
    aboutContent,
    pricingSectionState,
    pricingEvidenceState,
    pricingNotice,
    operationalDetailsState,
  };
}
