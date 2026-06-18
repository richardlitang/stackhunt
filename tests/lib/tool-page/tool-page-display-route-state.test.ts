import { describe, expect, it } from 'vitest';
import { buildToolPageDisplayRouteState } from '@/lib/tool-page/route-state/display-route-state';

describe('tool page display route state', () => {
  it('projects route-facing display fields from prep, runtime, and evidence states', () => {
    const result = buildToolPageDisplayRouteState({
      prepState: {
        comparableAlternatives: [{ slug: 'notion' }],
        hasComparableAlternatives: true,
        canCompareByAlternativeSlug: () => true,
      } as Parameters<typeof buildToolPageDisplayRouteState>[0]['prepState'],
      qualityState: {
        showReviewInProgressBanner: true,
      } as Parameters<typeof buildToolPageDisplayRouteState>[0]['qualityState'],
      decisionRuntime: {
        hasAbout: true,
        comparativeFeaturePeerCount: 2,
        hasPricing: true,
        renderVerdictSafe: false,
        hasVerdict: true,
        decisionSnapshotSummary: 'Strong for startup teams',
      } as Parameters<typeof buildToolPageDisplayRouteState>[0]['decisionRuntime'],
      sectionFlags: {
        hasFeatures: true,
        hasAlternatives: true,
        hasFAQ: true,
        hasGettingStarted: true,
        hasSpecs: true,
        hasCommunity: true,
        hasOperationalDetails: false,
      } as Parameters<typeof buildToolPageDisplayRouteState>[0]['sectionFlags'],
      presentationGates: {
        showProceduralVerdict: true,
        showProceduralSpecs: false,
      },
      reviewArtifactsState: {
        handsOnTestEnvironment: 'Chrome',
        handsOnTestSteps: ['Create workspace'],
        handsOnTestFindings: ['Fast setup'],
        handsOnTestedAtLabel: 'Mar 13, 2026',
        evaluationDepth: 'hands-on',
        testedItems: ['Core onboarding'],
        notTestedItems: [],
        showWeTestedIt: true,
      } as Parameters<typeof buildToolPageDisplayRouteState>[0]['reviewArtifactsState'],
      reviewSignalsView: {
        communityVerifiedLabel: 'Mar 2026',
      } as Parameters<typeof buildToolPageDisplayRouteState>[0]['reviewSignalsView'],
      evidenceRuntime: {
        hasStrengths: true,
        canonicalHardLimits: [],
        officialPricingSource: { url: 'https://example.com/pricing' },
        pricingEvidenceLinks: [{ sourceUrl: 'https://example.com/pricing', text: 'Pricing page' }],
        showPricingSection: true,
        pricingNarrativeLead: 'Pricing depends on seats',
        pricingNarrativeLabel: 'Pricing summary',
        hasCollectedSources: true,
      } as Parameters<typeof buildToolPageDisplayRouteState>[0]['evidenceRuntime'],
    });

    expect(result.hasComparableAlternatives).toBe(true);
    expect(result.showReviewInProgressBanner).toBe(true);
    expect(result.hasVerdict).toBe(true);
    expect(result.showProceduralVerdict).toBe(true);
    expect(result.communityVerifiedLabel).toBe('Mar 2026');
    expect(result.pricingNarrativeLabel).toBe('Pricing summary');
  });
});
