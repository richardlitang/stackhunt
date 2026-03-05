import { describe, expect, it } from 'vitest';
import { buildToolPageNavigationMediaStateFromDecisionContext } from '@/lib/tool-page/navigation-media-decision-context';
import { buildToolPageRuntimeNavigationStateFromDecisionContext } from '@/lib/tool-page/runtime-navigation-decision-context';
import { buildToolPageRuntimeViewBundleFromDecisionContext } from '@/lib/tool-page/runtime-view-bundle-decision-context';

describe('tool page runtime/navigation decision context', () => {
  it('matches explicit runtime then navigation wiring', () => {
    const runtime = {
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general',
      tool: {
        id: 'tool_1',
        slug: 'acme',
        name: 'Acme',
        verdict: 'Shortlist',
        review_count: 2,
      },
      primaryOffer: null,
      faqSchema: null,
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      decisionRuntime: {
        hasVerdict: true,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionSnapshotDifferentiators: ['Fast onboarding'],
        decisionSnapshotSummary: 'Acme is strong for small teams.',
        renderVerdictSafe: 'Strong shortlist candidate',
        introLooksSpecSheet: false,
      },
      sectionFlags: {
        hasGettingStarted: true,
        hasFeatures: true,
        hasSpecs: true,
        hasPlatform: true,
        hasAlternatives: true,
        hasSecurity: true,
        hasFAQ: true,
      },
      evidenceRuntime: {
        showPricingSection: true,
        hasCollectedSources: true,
        decisionTradeoffSummary: 'Great for lean teams',
        baseEvidenceGrade: 'B',
        avoidIfBullet: null,
        tradeoffCons: [],
        decisionProofPoints: [],
        hasPricingCheckedProof: true,
        pricingCheckedLabel: '2026-03-05',
        pricingSourceUrl: 'https://example.com/pricing',
        officialDocsSource: { url: 'https://example.com/docs' },
        officialPricingSource: { url: 'https://example.com/pricing' },
      },
      qualityState: {
        contentConfidenceLevel: 'medium',
        gateShouldIndex: true,
        isDraftPage: false,
        showReviewInProgressBanner: false,
        safeDraftDescription: 'Draft content',
      },
      reviewSignalsView: {
        specsVerifiedLabel: '2026-03-04',
        communityVerifiedLabel: '2026-03-03',
      },
      presentationGates: {
        showProceduralVerdict: false,
        showProceduralSpecs: false,
      },
      evaluationDepth: 'Light hands-on',
    } as never;

    const navigation = {
      decisionRuntime: { hasVerdict: true },
      sectionFlags: {
        hasGettingStarted: true,
        hasFeatures: true,
        hasSpecs: true,
        hasPlatform: true,
        hasFAQ: true,
        hasAlternatives: true,
      },
      presentationGates: {
        showProceduralVerdict: false,
        showProceduralSpecs: false,
      },
      evidenceSignals: {
        showPricingSection: true,
      },
      faqItems: [{ question: 'Q', answer: 'A', answer_source_url: null }],
      reviewArtifactsState: {
        evidenceBasis: [{ label: 'docs', count: 2 }],
        lowConfidenceEvidenceLinks: [{ url: 'https://community.example.com' }],
      },
      media: {
        tool: {
          id: 'tool_1',
          slug: 'acme',
          name: 'Acme',
          logo_url: null,
          pricing_type: 'subscription',
          user_verifications_this_week: 0,
          video_id: null,
          video_title: null,
        },
        category: { slug: 'project-management', name: 'Project Management' },
        knowledgeCard: null,
        renderVerdictSafe: 'Strong choice',
      },
    } as never;

    const result = buildToolPageRuntimeNavigationStateFromDecisionContext({ runtime, navigation });

    const expectedRuntime = buildToolPageRuntimeViewBundleFromDecisionContext(runtime);
    const expectedNavigation = buildToolPageNavigationMediaStateFromDecisionContext({
      ...navigation,
      updateHistoryEntries: expectedRuntime.runtimeViewBundle.updateHistoryEntries,
    });

    expect(JSON.parse(JSON.stringify(result.runtimeViewBundle))).toEqual(
      JSON.parse(JSON.stringify(expectedRuntime.runtimeViewBundle))
    );
    expect(result.navigationState).toEqual(expectedNavigation.navigationState);
    expect(result.ctaMediaState).toEqual(expectedNavigation.ctaMediaState);
  });
});
