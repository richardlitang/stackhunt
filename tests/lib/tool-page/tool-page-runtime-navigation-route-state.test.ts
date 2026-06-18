import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeNavigationRouteState } from '@/lib/tool-page/route-state/runtime-navigation-route-state';

describe('tool page runtime navigation route state', () => {
  it('assembles runtime and navigation state from flattened route inputs', () => {
    const result = buildToolPageRuntimeNavigationRouteState({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=startup'),
      activeReviewLens: 'startup',
      tool: {
        id: '1',
        name: 'Acme',
        slug: 'acme',
        logo_url: null,
        pricing_type: 'paid',
        user_verifications_this_week: 3,
        verdict: 'Strong fit for startup teams.',
        review_count: 8,
        video_id: null,
        video_title: null,
        category: null,
      } as Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0]['tool'],
      primaryOffer: null,
      faqSchema: null,
      toolMeta: {
        title: 'Acme Review',
        description: 'Decision guide',
        canonical: 'https://example.com/tool/acme',
      },
      canonicalHardLimits: [],
      decisionRuntime: {
        hasVerdict: true,
        renderVerdictSafe: 'Strong fit for startup teams.',
        decisionSnapshotBestWhen: [],
        decisionSnapshotWatchOuts: [],
        decisionSnapshotDifferentiators: [],
        decisionTradeoffSummary: null,
        avoidIfBullet: null,
        tradeoffCons: [],
        decisionProofPoints: [],
        decisionSnapshotSummary: null,
        introLooksSpecSheet: false,
      } as Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0]['decisionRuntime'],
      sectionFlags: {
        hasGettingStarted: true,
        hasFeatures: true,
        hasSpecs: true,
        hasPlatform: true,
        hasSecurity: true,
        hasFAQ: true,
        hasAlternatives: true,
      } as Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0]['sectionFlags'],
      evidenceRuntime: {
        showPricingSection: true,
        hasCollectedSources: true,
        baseEvidenceGrade: 'high',
        avoidIfBullet: null,
        tradeoffCons: [],
        decisionProofPoints: [],
        hasPricingCheckedProof: true,
        pricingCheckedLabel: 'Checked',
        pricingSourceUrl: null,
        officialDocsSource: null,
        officialPricingSource: null,
        decisionTradeoffSummary: null,
      } as Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0]['evidenceRuntime'],
      qualityState: {
        contentConfidenceLevel: 'high',
        gateShouldIndex: true,
        isDraftPage: false,
        showReviewInProgressBanner: false,
        safeDraftDescription: 'Draft',
      } as Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0]['qualityState'],
      reviewSignalsView: {
        specsVerifiedLabel: 'Specs verified',
        communityVerifiedLabel: 'Community verified',
      } as Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0]['reviewSignalsView'],
      presentationGates: {
        showProceduralVerdict: false,
        showProceduralSpecs: false,
      },
      evaluationDepth: 'High',
      hasStrengths: true,
      faqItems: [{ question: 'Q1', answer: 'A1' }],
      reviewArtifactsState: {
        evidenceBasis: [],
        lowConfidenceEvidenceLinks: [],
      },
      category: {
        slug: 'project-management',
        name: 'Project Management',
      },
      knowledgeCard: null,
      renderVerdictSafe: 'Strong fit for startup teams.',
      laneOutputs: null,
    });

    expect(result.runtimeViewBundle.meta.title).toBe('Acme Review');
    expect(result.navigationState.quickJumpLinks.length).toBeGreaterThan(0);
    expect(result.ctaMediaState.compareButtonProps.toolName).toBe('Acme');
  });
});
