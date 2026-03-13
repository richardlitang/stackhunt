import { buildToolPageChromeLensStateFromRouteContext } from '@/lib/tool-page/chrome-lens-state';
import { buildToolPageContentAlternativesStateFromRouteContext } from '@/lib/tool-page/content-alternatives-state';
import { toToolPageObjectArray } from '@/lib/tool-page/route-normalizers';

interface BuildToolPageChromeRouteStateFromDecisionContextInput {
  chromeLens: {
    lensRuntime: Parameters<typeof buildToolPageChromeLensStateFromRouteContext>[0]['lensRuntime'];
    activeReviewLens: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['activeReviewLens'];
    toolCategory: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['toolCategory'];
    tool: Parameters<typeof buildToolPageChromeLensStateFromRouteContext>[0]['chrome']['tool'];
    websiteHostLabel: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['websiteHostLabel'];
    runtimeViewBundle: {
      trustConfidenceLabel: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['trustConfidenceLabel'];
      pendingVerificationCount: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['pendingVerificationCount'];
      trustStatus: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['trustStatus'];
      lensLabelMap: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['lensLabelMap'];
    };
    evidenceRuntime: {
      hasCollectedSources: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['hasCollectedSources'];
      collectedSourcesTotal: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['collectedSourcesTotal'];
      pricingCheckedLabel: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['pricingCheckedLabel'];
    };
    reviewSignalsView: {
      communityVerifiedLabel: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['communityVerifiedLabel'];
      specsVerifiedLabel: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['specsVerifiedLabel'];
      pricingVerifiedLabel: Parameters<
        typeof buildToolPageChromeLensStateFromRouteContext
      >[0]['chrome']['pricingVerifiedLabel'];
    };
    evaluationDepth: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['evaluationDepth'];
    qualityState: {
      communityCorroborationCount: number;
      userSignalCoveragePending?: boolean;
      userSignalNeedsConfirmationCount?: number;
      userSignalChannelCoverageCount?: number;
    };
  };
  contentAlternatives: {
    activeReviewLens: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['alternativesPricing']['activeReviewLens'];
    alternativesLabel: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['alternativesPricing']['alternativesLabel'];
    toolCategoryRef: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['alternativesPricing']['category'];
    orderedAlternatives: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['alternativesPricing']['orderedAlternatives'];
    comparableAlternatives: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['alternativesPricing']['comparableAlternatives'];
    canCompareByAlternativeSlug: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['alternativesPricing']['canCompareByAlternativeSlug'];
    tool: {
      name: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['tool']['name'];
      slug: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['alternativesPricing']['tool']['slug'];
      specs: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['alternativesPricing']['tool']['specs'];
      website: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['tool']['website'];
      long_description: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['tool']['long_description'];
      affiliate_offers: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['tool']['affiliate_offers'];
    };
    knowledgeCard: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['contentSections']['knowledgeCard'];
    parentTool: unknown;
    setupTracks: unknown;
    displayCategorySpecificData: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['contentSections']['displayCategorySpecificData'];
    vipSpecifics: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['contentSections']['vipSpecifics'];
    userReportedPros: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['contentSections']['userReportedPros'];
    userReportedCons: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['contentSections']['userReportedCons'];
    laneOutputs?: Parameters<
      typeof buildToolPageContentAlternativesStateFromRouteContext
    >[0]['contentSections']['laneOutputs'];
    decisionRuntime: {
      setupSignals: {
        gettingStartedCtaUrl: Parameters<
          typeof buildToolPageContentAlternativesStateFromRouteContext
        >[0]['contentSections']['gettingStartedCtaUrl'];
      };
      guardedHumanVerdict: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['guardedHumanVerdict'];
      guardedAvoidIf: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['guardedAvoidIf'];
    };
    sectionFlags: {
      hasCommunity: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['hasCommunity'];
      hasSecurity: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['hasSecurity'];
      hasPortability: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['hasPortability'];
    };
    evidenceRuntime: {
      effectiveEvidencePros: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['effectiveEvidencePros'];
      effectiveEvidenceCons: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['effectiveEvidenceCons'];
      collectedSourcesBySection: {
        pros_cons: Parameters<
          typeof buildToolPageContentAlternativesStateFromRouteContext
        >[0]['contentSections']['prosConsSourcesCount'];
      };
      pricingCheckedLabel: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['pricingCheckedLabel'];
      officialPricingSource: {
        url?: string | null;
      } | null;
      pricingEvidenceLinks: Array<unknown>;
    };
    reviewArtifactsState: {
      evidenceLinks: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['evidenceLinks'];
      lowConfidenceEvidenceLinks: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['lowConfidenceEvidenceLinks'];
      evidenceBasis: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['evidenceBasis'];
    };
    reviewSignalsView: {
      specsVerifiedLabel: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['specsVerifiedLabel'];
    };
    reviewContextSignals: {
      budgetCostDrivers: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['alternativesPricing']['budgetCostDrivers'];
      budgetOneTimeFees: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['alternativesPricing']['budgetOneTimeFees'];
      budgetCommitmentTerms: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['alternativesPricing']['budgetCommitmentTerms'];
      budgetRoiThreshold: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['alternativesPricing']['budgetRoiThreshold'];
      userAdvocate: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['userAdvocate'];
      vibe: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['vibe'];
      originStory: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['originStory'];
      idealFor: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['idealFor'];
      powerTip: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['powerTip'];
      delighters: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['delighters'];
      frustrations: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['frustrations'];
    };
    qualityState: {
      communityCorroborationCount: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['communityCorroborationCount'];
      userSignalClaimsCount?: Parameters<
        typeof buildToolPageContentAlternativesStateFromRouteContext
      >[0]['contentSections']['userSignalClaimsCount'];
    };
  };
}

export function buildToolPageChromeRouteStateFromDecisionContext(
  input: BuildToolPageChromeRouteStateFromDecisionContextInput
) {
  const { lensViewFields, toolChromeState } = buildToolPageChromeLensStateFromRouteContext({
    lensRuntime: input.chromeLens.lensRuntime,
    chrome: {
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
    },
  });
  const { alternativesPricingState, contentSectionsState } =
    buildToolPageContentAlternativesStateFromRouteContext({
      alternativesPricing: {
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
      },
      contentSections: {
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
      },
    });
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
