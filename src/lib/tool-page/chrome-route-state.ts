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

interface BuildToolPageAlternativesPricingStateInputFromRouteDataInput {
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

interface BuildToolPageContentSectionsStateInputFromRouteDataInput {
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

interface BuildToolPageChromeRouteStateFromDecisionContextInput {
  chromeLens: {
    lensRuntime: Parameters<typeof buildToolPageLensViewFields>[0];
    activeReviewLens: BuildToolPageChromeStateInputFromRouteDataInput['activeReviewLens'];
    toolCategory: BuildToolPageChromeStateInputFromRouteDataInput['toolCategory'];
    tool: BuildToolPageChromeStateInputFromRouteDataInput['tool'];
    websiteHostLabel: BuildToolPageChromeStateInputFromRouteDataInput['websiteHostLabel'];
    runtimeViewBundle: {
      trustConfidenceLabel: BuildToolPageChromeStateInputFromRouteDataInput['trustConfidenceLabel'];
      pendingVerificationCount: BuildToolPageChromeStateInputFromRouteDataInput['pendingVerificationCount'];
      trustStatus: BuildToolPageChromeStateInputFromRouteDataInput['trustStatus'];
      lensLabelMap: BuildToolPageChromeStateInputFromRouteDataInput['lensLabelMap'];
    };
    evidenceRuntime: {
      hasCollectedSources: BuildToolPageChromeStateInputFromRouteDataInput['hasCollectedSources'];
      collectedSourcesTotal: BuildToolPageChromeStateInputFromRouteDataInput['collectedSourcesTotal'];
      pricingCheckedLabel: BuildToolPageChromeStateInputFromRouteDataInput['pricingCheckedLabel'];
    };
    reviewSignalsView: {
      communityVerifiedLabel: BuildToolPageChromeStateInputFromRouteDataInput['communityVerifiedLabel'];
      specsVerifiedLabel: BuildToolPageChromeStateInputFromRouteDataInput['specsVerifiedLabel'];
      pricingVerifiedLabel: BuildToolPageChromeStateInputFromRouteDataInput['pricingVerifiedLabel'];
    };
    evaluationDepth: BuildToolPageChromeStateInputFromRouteDataInput['evaluationDepth'];
    qualityState: {
      communityCorroborationCount: number;
      userSignalCoveragePending?: boolean;
      userSignalNeedsConfirmationCount?: number;
      userSignalChannelCoverageCount?: number;
    };
  };
  contentAlternatives: {
    activeReviewLens: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['activeReviewLens'];
    alternativesLabel: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['alternativesLabel'];
    toolCategoryRef: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['category'];
    orderedAlternatives: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['orderedAlternatives'];
    comparableAlternatives: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['comparableAlternatives'];
    canCompareByAlternativeSlug: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['canCompareByAlternativeSlug'];
    tool: {
      name: BuildToolPageContentSectionsStateInputFromRouteDataInput['tool']['name'];
      slug: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['tool']['slug'];
      specs: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['tool']['specs'];
      website: BuildToolPageContentSectionsStateInputFromRouteDataInput['tool']['website'];
      long_description: BuildToolPageContentSectionsStateInputFromRouteDataInput['tool']['long_description'];
      affiliate_offers: BuildToolPageContentSectionsStateInputFromRouteDataInput['tool']['affiliate_offers'];
    };
    knowledgeCard: BuildToolPageContentSectionsStateInputFromRouteDataInput['knowledgeCard'];
    parentTool: unknown;
    setupTracks: unknown;
    displayCategorySpecificData: BuildToolPageContentSectionsStateInputFromRouteDataInput['displayCategorySpecificData'];
    vipSpecifics: BuildToolPageContentSectionsStateInputFromRouteDataInput['vipSpecifics'];
    userReportedPros: BuildToolPageContentSectionsStateInputFromRouteDataInput['userReportedPros'];
    userReportedCons: BuildToolPageContentSectionsStateInputFromRouteDataInput['userReportedCons'];
    laneOutputs?: BuildToolPageContentSectionsStateInputFromRouteDataInput['laneOutputs'];
    decisionRuntime: {
      setupSignals: {
        gettingStartedCtaUrl: BuildToolPageContentSectionsStateInputFromRouteDataInput['gettingStartedCtaUrl'];
      };
      guardedHumanVerdict: BuildToolPageContentSectionsStateInputFromRouteDataInput['guardedHumanVerdict'];
      guardedAvoidIf: BuildToolPageContentSectionsStateInputFromRouteDataInput['guardedAvoidIf'];
    };
    sectionFlags: {
      hasCommunity: BuildToolPageContentSectionsStateInputFromRouteDataInput['hasCommunity'];
      hasSecurity: BuildToolPageContentSectionsStateInputFromRouteDataInput['hasSecurity'];
      hasPortability: BuildToolPageContentSectionsStateInputFromRouteDataInput['hasPortability'];
    };
    evidenceRuntime: {
      effectiveEvidencePros: BuildToolPageContentSectionsStateInputFromRouteDataInput['effectiveEvidencePros'];
      effectiveEvidenceCons: BuildToolPageContentSectionsStateInputFromRouteDataInput['effectiveEvidenceCons'];
      collectedSourcesBySection: {
        pros_cons: BuildToolPageContentSectionsStateInputFromRouteDataInput['prosConsSourcesCount'];
      };
      pricingCheckedLabel: BuildToolPageContentSectionsStateInputFromRouteDataInput['pricingCheckedLabel'];
      officialPricingSource: { url?: string | null } | null;
      pricingEvidenceLinks: Array<unknown>;
    };
    reviewArtifactsState: {
      evidenceLinks: BuildToolPageContentSectionsStateInputFromRouteDataInput['evidenceLinks'];
      lowConfidenceEvidenceLinks: BuildToolPageContentSectionsStateInputFromRouteDataInput['lowConfidenceEvidenceLinks'];
      evidenceBasis: BuildToolPageContentSectionsStateInputFromRouteDataInput['evidenceBasis'];
    };
    reviewSignalsView: {
      specsVerifiedLabel: BuildToolPageContentSectionsStateInputFromRouteDataInput['specsVerifiedLabel'];
    };
    reviewContextSignals: {
      budgetCostDrivers: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['budgetCostDrivers'];
      budgetOneTimeFees: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['budgetOneTimeFees'];
      budgetCommitmentTerms: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['budgetCommitmentTerms'];
      budgetRoiThreshold: BuildToolPageAlternativesPricingStateInputFromRouteDataInput['budgetRoiThreshold'];
      userAdvocate: BuildToolPageContentSectionsStateInputFromRouteDataInput['userAdvocate'];
      vibe: BuildToolPageContentSectionsStateInputFromRouteDataInput['vibe'];
      originStory: BuildToolPageContentSectionsStateInputFromRouteDataInput['originStory'];
      idealFor: BuildToolPageContentSectionsStateInputFromRouteDataInput['idealFor'];
      powerTip: BuildToolPageContentSectionsStateInputFromRouteDataInput['powerTip'];
      delighters: BuildToolPageContentSectionsStateInputFromRouteDataInput['delighters'];
      frustrations: BuildToolPageContentSectionsStateInputFromRouteDataInput['frustrations'];
    };
    qualityState: {
      communityCorroborationCount: BuildToolPageContentSectionsStateInputFromRouteDataInput['communityCorroborationCount'];
      userSignalClaimsCount?: BuildToolPageContentSectionsStateInputFromRouteDataInput['userSignalClaimsCount'];
    };
  };
}

export function buildToolPageChromeRouteStateFromDecisionContext(
  input: BuildToolPageChromeRouteStateFromDecisionContextInput
) {
  const lensViewFields = buildToolPageLensViewFields(input.chromeLens.lensRuntime);
  const toolChromeState = buildToolPageChromeState(
    buildToolPageChromeStateInputFromRoute({
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
      website: input.chromeLens.tool.website || null,
      websiteHostLabel: input.chromeLens.websiteHostLabel,
    })
  );
  const alternativesPricingState = buildToolPageAlternativesPricingState(
    buildToolPageAlternativesPricingStateInputFromRoute({
      activeReviewLens: input.contentAlternatives.activeReviewLens,
      budgetCostDrivers: input.contentAlternatives.reviewContextSignals.budgetCostDrivers,
      budgetOneTimeFees: input.contentAlternatives.reviewContextSignals.budgetOneTimeFees,
      budgetCommitmentTerms: input.contentAlternatives.reviewContextSignals.budgetCommitmentTerms,
      budgetRoiThreshold: input.contentAlternatives.reviewContextSignals.budgetRoiThreshold,
      alternativesLabel: input.contentAlternatives.alternativesLabel,
      categoryName: input.contentAlternatives.toolCategoryRef?.name || null,
      category: input.contentAlternatives.toolCategoryRef,
      comparableAlternatives: toToolPageComparableAlternatives(
        input.contentAlternatives.comparableAlternatives
      ),
      orderedAlternatives: toToolPageOrderedAlternatives(
        input.contentAlternatives.orderedAlternatives
      ),
      canCompareByAlternativeSlug: input.contentAlternatives.canCompareByAlternativeSlug,
      toolSlug: input.contentAlternatives.tool.slug,
      toolSpecs: toToolPageSpecsRecord(input.contentAlternatives.tool.specs),
    })
  );
  const contentSectionsState = buildToolPageContentSectionsState(
    buildToolPageContentSectionsStateInputFromRoute({
      evidenceLinks: input.contentAlternatives.reviewArtifactsState.evidenceLinks,
      lowConfidenceEvidenceLinks:
        input.contentAlternatives.reviewArtifactsState.lowConfidenceEvidenceLinks,
      effectiveEvidencePros: input.contentAlternatives.evidenceRuntime.effectiveEvidencePros,
      effectiveEvidenceCons: input.contentAlternatives.evidenceRuntime.effectiveEvidenceCons,
      userReportedPros: input.contentAlternatives.userReportedPros,
      userReportedCons: input.contentAlternatives.userReportedCons,
      laneOutputs: input.contentAlternatives.laneOutputs,
      knowledgeCard: input.contentAlternatives.knowledgeCard,
      fallbackWebsiteUrl: input.contentAlternatives.tool.website || null,
      setupTracks: toToolPageObjectArray(input.contentAlternatives.setupTracks),
      gettingStartedCtaUrl:
        input.contentAlternatives.decisionRuntime.setupSignals.gettingStartedCtaUrl,
      toolName: input.contentAlternatives.tool.name,
      prosConsSourcesCount:
        input.contentAlternatives.evidenceRuntime.collectedSourcesBySection.pros_cons,
      communityCorroborationCount:
        input.contentAlternatives.qualityState.communityCorroborationCount,
      userSignalClaimsCount: input.contentAlternatives.qualityState.userSignalClaimsCount,
      affiliateOffers: input.contentAlternatives.tool.affiliate_offers || [],
      evidenceBasis: input.contentAlternatives.reviewArtifactsState.evidenceBasis,
      tribalKnowledge: {
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
      },
      displayCategorySpecificData: input.contentAlternatives.displayCategorySpecificData,
      vipSpecifics: input.contentAlternatives.vipSpecifics,
      categoryName: input.contentAlternatives.toolCategoryRef?.name || null,
      specsVerifiedLabel: input.contentAlternatives.reviewSignalsView.specsVerifiedLabel,
      longDescription: input.contentAlternatives.tool.long_description,
      pricingCheckedLabel: input.contentAlternatives.evidenceRuntime.pricingCheckedLabel,
      hasOfficialPricingSource: Boolean(
        input.contentAlternatives.evidenceRuntime.officialPricingSource
      ),
      pricingEvidenceCount: input.contentAlternatives.evidenceRuntime.pricingEvidenceLinks.length,
      hasSecurity: input.contentAlternatives.sectionFlags.hasSecurity,
      hasPortability: input.contentAlternatives.sectionFlags.hasPortability,
      hasParentTool: Boolean(input.contentAlternatives.parentTool),
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
