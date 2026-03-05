import { describe, expect, it } from 'vitest';
import { buildToolPageNavigationMediaStateFromDecisionContext } from '@/lib/tool-page/navigation-media-decision-context';
import { buildToolPageNavigationMediaStateFromRouteContext } from '@/lib/tool-page/navigation-media-state';

describe('tool page navigation/media decision context', () => {
  it('matches explicit route-context wiring', () => {
    const decisionRuntime = {
      hasVerdict: true,
    } as const;
    const sectionFlags = {
      hasGettingStarted: true,
      hasFeatures: true,
      hasSpecs: true,
      hasPlatform: true,
      hasFAQ: true,
      hasAlternatives: true,
    } as const;
    const presentationGates = {
      showProceduralVerdict: false,
      showProceduralSpecs: false,
    } as const;
    const evidenceSignals = {
      showPricingSection: true,
    } as const;
    const faqItems = [{ question: 'Q', answer: 'A', answer_source_url: null }];
    const reviewArtifactsState = {
      evidenceBasis: [{ label: 'docs', count: 2 }],
      lowConfidenceEvidenceLinks: [{ url: 'https://community.example.com' }],
    };
    const updateHistoryEntries = [{ label: 'Updated', isoDate: '2026-03-05' }];
    const media = {
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
    };

    const result = buildToolPageNavigationMediaStateFromDecisionContext({
      decisionRuntime: decisionRuntime as never,
      sectionFlags: sectionFlags as never,
      presentationGates,
      evidenceSignals,
      faqItems,
      reviewArtifactsState: reviewArtifactsState as never,
      updateHistoryEntries: updateHistoryEntries as never,
      media,
    });

    const expected = buildToolPageNavigationMediaStateFromRouteContext({
      navigation: {
        hasVerdict: true,
        showProceduralVerdict: false,
        hasGettingStarted: true,
        showPricingSection: true,
        hasFeatures: true,
        hasSpecs: true,
        showProceduralSpecs: false,
        hasPlatform: true,
        hasFAQ: true,
        hasAlternatives: true,
        faqItems,
        evidenceBasis: reviewArtifactsState.evidenceBasis,
        lowConfidenceEvidenceLinks: reviewArtifactsState.lowConfidenceEvidenceLinks,
        updateHistoryEntries,
      },
      media,
    });

    expect(result.navigationState).toEqual(expected.navigationState);
    expect(result.ctaMediaState).toEqual(expected.ctaMediaState);
  });
});
