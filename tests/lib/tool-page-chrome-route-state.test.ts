import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesPricingStateInputFromRoute } from '@/lib/tool-page/alternatives-pricing-input';
import { buildToolPageAlternativesPricingState } from '@/lib/tool-page/alternatives-pricing-state';
import { buildToolPageChromeStateInputFromRoute } from '@/lib/tool-page/chrome-input';
import { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/chrome-route-state';
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

describe('tool page chrome route state', () => {
  it('matches explicit chrome-lens and content-alternatives route-context wiring', () => {
    const input = {
      chromeLens: {
        lensRuntime: {
          lensHrefs: [],
          focusSwitchOptions: [],
          lensDefaultFocus: 'general',
          showFocusSwitch: false,
          lensPriorityLinks: [],
          verdictLabelRationale: null,
          reviewDek: null,
          readerFocusNote: null,
          lensBestFitLine: null,
          lensWeakFitLine: null,
          lensTradeoffLine: null,
          scoreDrivers: [],
          workflowFitHighlights: [],
          workflowFitCards: [],
        },
        activeReviewLens: 'general',
        toolCategory: { slug: 'project-management', name: 'Project Management' },
        tool: { website: 'https://acme.com' },
        websiteHostLabel: 'acme.com',
        runtimeViewBundle: {
          trustConfidenceLabel: 'High',
          pendingVerificationCount: 1,
          trustStatus: 'Source-backed',
          lensLabelMap: {
            general: 'General',
            personal: 'Solo / Freelancer',
            startup: 'Startup',
            enterprise: 'Enterprise',
          },
        },
        evidenceRuntime: {
          hasCollectedSources: true,
          collectedSourcesTotal: 12,
          pricingCheckedLabel: '2026-03-05',
        },
        reviewSignalsView: {
          communityVerifiedLabel: '2026-03-04',
          specsVerifiedLabel: '2026-03-03',
          pricingVerifiedLabel: '2026-03-02',
        },
        evaluationDepth: 'Light hands-on',
        qualityState: { communityCorroborationCount: 2 },
      } as never,
      contentAlternatives: {
        activeReviewLens: 'general',
        alternativesLabel: 'Alternatives',
        toolCategoryRef: { slug: 'project-management', name: 'Project Management' },
        orderedAlternatives: [],
        comparableAlternatives: [],
        canCompareByAlternativeSlug: {},
        tool: {
          name: 'Acme',
          slug: 'acme',
          specs: {},
          website: 'https://acme.com',
          long_description: 'Acme long description',
          affiliate_offers: [],
        },
        knowledgeCard: null,
        parentTool: null,
        setupTracks: [],
        displayCategorySpecificData: null,
        vipSpecifics: null,
        decisionRuntime: {
          setupSignals: { gettingStartedCtaUrl: '/tool/acme#getting-started' },
          guardedHumanVerdict: 'Strong contender',
          guardedAvoidIf: ['Strict compliance orgs'],
        },
        sectionFlags: {
          hasCommunity: true,
          hasSecurity: true,
          hasPortability: true,
        },
        evidenceRuntime: {
          effectiveEvidencePros: [],
          effectiveEvidenceCons: [],
          collectedSourcesBySection: { pros_cons: 3 },
          pricingCheckedLabel: '2026-03-05',
          officialPricingSource: { url: 'https://acme.com/pricing' },
          pricingEvidenceLinks: [],
        },
        reviewArtifactsState: {
          evidenceLinks: [],
          lowConfidenceEvidenceLinks: [],
          evidenceBasis: [],
        },
        reviewSignalsView: {
          specsVerifiedLabel: '2026-03-04',
        },
        reviewContextSignals: {
          budgetCostDrivers: ['Per-seat growth'],
          budgetOneTimeFees: ['Implementation fee'],
          budgetCommitmentTerms: ['Annual discount'],
          budgetRoiThreshold: '10 seats',
          userAdvocate: { audience: 'small teams' },
          vibe: 'Pragmatic',
          originStory: 'Built for remote work',
          idealFor: ['Small teams'],
          powerTip: 'Use templates',
          delighters: ['Fast onboarding'],
          frustrations: ['Limited offline mode'],
        },
        qualityState: { communityCorroborationCount: 2 },
      } as never,
    };

    const routeState = buildToolPageChromeRouteStateFromDecisionContext(input);
    const expectedChromeLens = {
      lensViewFields: buildToolPageLensViewFields(input.chromeLens.lensRuntime as never),
      toolChromeState: buildToolPageChromeState(
        buildToolPageChromeStateInputFromRoute({
          toolCategory: input.chromeLens.toolCategory,
          hasCollectedSources: input.chromeLens.evidenceRuntime.hasCollectedSources,
          evaluationDepth: input.chromeLens.evaluationDepth,
          collectedSourcesTotal: input.chromeLens.evidenceRuntime.collectedSourcesTotal,
          trustConfidenceLabel: input.chromeLens.runtimeViewBundle.trustConfidenceLabel,
          pendingVerificationCount: input.chromeLens.runtimeViewBundle.pendingVerificationCount,
          communityCorroborationCount: input.chromeLens.qualityState.communityCorroborationCount,
          communityVerifiedLabel: input.chromeLens.reviewSignalsView.communityVerifiedLabel,
          specsVerifiedLabel: input.chromeLens.reviewSignalsView.specsVerifiedLabel,
          pricingCheckedLabel: input.chromeLens.evidenceRuntime.pricingCheckedLabel,
          pricingVerifiedLabel: input.chromeLens.reviewSignalsView.pricingVerifiedLabel,
          trustStatus: input.chromeLens.runtimeViewBundle.trustStatus,
          activeReviewLens: input.chromeLens.activeReviewLens,
          lensLabelMap: input.chromeLens.runtimeViewBundle.lensLabelMap,
          website: input.chromeLens.tool.website,
          websiteHostLabel: input.chromeLens.websiteHostLabel,
        })
      ),
    };
    const expectedContentAlternatives = {
      alternativesPricingState: buildToolPageAlternativesPricingState(
        buildToolPageAlternativesPricingStateInputFromRoute({
          activeReviewLens: input.contentAlternatives.activeReviewLens,
          budgetCostDrivers: input.contentAlternatives.reviewContextSignals.budgetCostDrivers,
          budgetOneTimeFees: input.contentAlternatives.reviewContextSignals.budgetOneTimeFees,
          budgetCommitmentTerms:
            input.contentAlternatives.reviewContextSignals.budgetCommitmentTerms,
          budgetRoiThreshold: input.contentAlternatives.reviewContextSignals.budgetRoiThreshold,
          toolSpecs: toToolPageSpecsRecord(input.contentAlternatives.tool.specs),
          alternativesLabel: input.contentAlternatives.alternativesLabel,
          categoryName: input.contentAlternatives.toolCategoryRef?.name || null,
          toolSlug: input.contentAlternatives.tool.slug,
          comparableAlternatives: toToolPageComparableAlternatives(
            input.contentAlternatives.comparableAlternatives
          ),
          category: input.contentAlternatives.toolCategoryRef,
          orderedAlternatives: toToolPageOrderedAlternatives(
            input.contentAlternatives.orderedAlternatives
          ),
          canCompareByAlternativeSlug: input.contentAlternatives.canCompareByAlternativeSlug,
        })
      ),
      contentSectionsState: buildToolPageContentSectionsState(
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
          fallbackWebsiteUrl: input.contentAlternatives.tool.website,
          setupTracks: toToolPageObjectArray(input.contentAlternatives.setupTracks),
          gettingStartedCtaUrl:
            input.contentAlternatives.decisionRuntime.setupSignals.gettingStartedCtaUrl,
          toolName: input.contentAlternatives.tool.name,
          prosConsSourcesCount:
            input.contentAlternatives.evidenceRuntime.collectedSourcesBySection.pros_cons,
          communityCorroborationCount:
            input.contentAlternatives.qualityState.communityCorroborationCount,
          userSignalClaimsCount: input.contentAlternatives.qualityState.userSignalClaimsCount,
          affiliateOffers: input.contentAlternatives.tool.affiliate_offers,
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
          pricingEvidenceCount:
            input.contentAlternatives.evidenceRuntime.pricingEvidenceLinks.length,
          hasSecurity: input.contentAlternatives.sectionFlags.hasSecurity,
          hasPortability: input.contentAlternatives.sectionFlags.hasPortability,
          hasParentTool: Boolean(input.contentAlternatives.parentTool),
        })
      ),
    };

    expect(routeState.lensViewFields).toEqual(expectedChromeLens.lensViewFields);
    expect(routeState.toolChromeState).toEqual(expectedChromeLens.toolChromeState);
    expect(routeState.alternativesPricingState).toEqual(
      expectedContentAlternatives.alternativesPricingState
    );
    expect(routeState.contentSectionsState).toEqual(
      expectedContentAlternatives.contentSectionsState
    );
    expect(routeState.reviewInProgressBannerText).toEqual(
      expectedChromeLens.toolChromeState.reviewInProgressBannerText
    );
    expect(routeState.compareTeaserLinks).toEqual(
      expectedContentAlternatives.alternativesPricingState.compareTeaserLinks
    );
    expect(routeState.prosConsView).toEqual(
      expectedContentAlternatives.contentSectionsState.prosConsView
    );
  });
});
