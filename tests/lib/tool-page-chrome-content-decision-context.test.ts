import { describe, expect, it } from 'vitest';
import { buildToolPageChromeContentStateFromDecisionContext } from '@/lib/tool-page/chrome-content-decision-context';
import { buildToolPageChromeLensStateFromDecisionContext } from '@/lib/tool-page/chrome-lens-decision-context';
import { buildToolPageContentAlternativesStateFromDecisionContext } from '@/lib/tool-page/content-alternatives-decision-context';

describe('tool page chrome/content decision context', () => {
  it('matches explicit chrome+lens and content+alternatives wiring', () => {
    const chromeLens = {
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
    } as never;

    const contentAlternatives = {
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
    } as never;

    const result = buildToolPageChromeContentStateFromDecisionContext({
      chromeLens,
      contentAlternatives,
    });
    const expectedChromeLens = buildToolPageChromeLensStateFromDecisionContext(chromeLens);
    const expectedContentAlternatives =
      buildToolPageContentAlternativesStateFromDecisionContext(contentAlternatives);

    expect(result.lensViewFields).toEqual(expectedChromeLens.lensViewFields);
    expect(result.toolChromeState).toEqual(expectedChromeLens.toolChromeState);
    expect(result.alternativesPricingState).toEqual(
      expectedContentAlternatives.alternativesPricingState
    );
    expect(result.contentSectionsState).toEqual(expectedContentAlternatives.contentSectionsState);
  });
});
