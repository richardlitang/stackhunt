import { buildToolPageChromeContentStateFromDecisionContext } from '@/lib/tool-page/chrome-content-decision-context';

interface BuildToolPageChromeRouteStateFromDecisionContextInput {
  chromeLens: Parameters<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >[0]['chromeLens'];
  contentAlternatives: Parameters<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >[0]['contentAlternatives'];
}

export function buildToolPageChromeRouteStateFromDecisionContext(
  input: BuildToolPageChromeRouteStateFromDecisionContextInput
): {
  lensViewFields: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields'];
  lensHrefs: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['lensHrefs'];
  focusSwitchOptions: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['focusSwitchOptions'];
  lensDefaultFocus: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['lensDefaultFocus'];
  showFocusSwitch: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['showFocusSwitch'];
  lensPriorityLinks: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['lensPriorityLinks'];
  verdictLabelRationale: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['verdictLabelRationale'];
  reviewDek: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['reviewDek'];
  readerFocusNote: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['readerFocusNote'];
  lensBestFitLine: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['lensBestFitLine'];
  lensWeakFitLine: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['lensWeakFitLine'];
  lensTradeoffLine: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['lensTradeoffLine'];
  scoreDrivers: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['scoreDrivers'];
  workflowFitHighlights: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['workflowFitHighlights'];
  workflowFitCards: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['lensViewFields']['workflowFitCards'];
  toolChromeState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState'];
  reviewInProgressBannerText: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['reviewInProgressBannerText'];
  researchStatusView: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['researchStatusView'];
  categoryBreadcrumb: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['categoryBreadcrumb'];
  trustBarProps: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['trustBarProps'];
  verificationBadgeLabel: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['verificationBadgeLabel'];
  websiteState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['websiteState'];
  websiteDisplayLabel: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['websiteDisplayLabel'];
  lensPriorityLead: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['lensPriorityLead'];
  freshnessLabels: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['toolChromeState']['freshnessLabels'];
  alternativesPricingState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['alternativesPricingState'];
  pricingInsightsBudgetAnalyst: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['alternativesPricingState']['pricingInsightsBudgetAnalyst'];
  alternativesIntroText: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['alternativesPricingState']['alternativesIntroText'];
  compareTeaserLinks: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['alternativesPricingState']['compareTeaserLinks'];
  alternativesSectionState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['alternativesPricingState']['alternativesSectionState'];
  alternativeCardsView: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['alternativesPricingState']['alternativeCardsView'];
  contentSectionsState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState'];
  sourceListsView: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['sourceListsView'];
  prosConsView: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['prosConsView'];
  gettingStartedProps: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['gettingStartedProps'];
  strengthsSubtitle: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['strengthsSubtitle'];
  affiliateOffersView: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['affiliateOffersView'];
  evidenceBasisChips: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['evidenceBasisChips'];
  tribalKnowledgeProps: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['tribalKnowledgeProps'];
  platformSectionState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['platformSectionState'];
  specsProps: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['specsProps'];
  specsSectionState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['specsSectionState'];
  aboutContent: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['aboutContent'];
  pricingSectionState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['pricingSectionState'];
  pricingEvidenceState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['pricingEvidenceState'];
  pricingNotice: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['pricingNotice'];
  operationalDetailsState: ReturnType<
    typeof buildToolPageChromeContentStateFromDecisionContext
  >['contentSectionsState']['operationalDetailsState'];
} {
  const { lensViewFields, toolChromeState, alternativesPricingState, contentSectionsState } =
    buildToolPageChromeContentStateFromDecisionContext(input);
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
