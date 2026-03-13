import { describe, expect, it } from 'vitest';
import { buildToolPagePageAssemblyRouteStateInputFromRouteContext } from '@/lib/tool-page/page-assembly-route-input';

describe('tool page page assembly route input', () => {
  it('maps flattened route context into page assembly helper input', () => {
    const result = buildToolPagePageAssemblyRouteStateInputFromRouteContext({
      runtimeViewBundle: {
        lensRuntime: { activeReviewLens: 'startup' },
      } as any,
      firstReview: null,
      tool: {
        name: 'Acme',
        category: { slug: 'project-management', name: 'Project Management' },
        pricing_type: 'tiered',
      } as any,
      activeReviewLens: 'startup',
      alternativesLabel: 'Alternatives',
      toolCategoryRef: { slug: 'project-management', name: 'Project Management' },
      orderedAlternatives: [],
      comparableAlternatives: [],
      canCompareByAlternativeSlug: () => true,
      knowledgeCard: { integrations: { has_api: true } } as any,
      parentTool: null,
      setupTracks: [],
      displayCategorySpecificData: null,
      vipSpecifics: null,
      userReportedPros: [],
      userReportedCons: [],
      laneOutputs: null,
      decisionRuntime: {} as any,
      sectionFlags: {} as any,
      evidenceRuntime: {} as any,
      reviewArtifactsState: {} as any,
      reviewSignalsView: {} as any,
      reviewContextSignals: { hasUserSignals: false, hasCommunitySignals: false },
      qualityState: { contentConfidenceLabel: 'High confidence' } as any,
      websiteHostLabel: 'acme.com',
      evaluationDepth: null,
      resolvedSubject: { subjectType: 'product', entityScope: 'single' },
      audiences: [{ slug: 'startups' }],
      topLensHardLimit: null,
      pricingEvidenceLinks: [],
      officialPricingSourceUrl: 'https://acme.com/pricing',
      navigationState: {} as any,
      ctaMediaState: {} as any,
    });

    expect(result.runtime.categoryName).toBe('Project Management');
    expect(result.chrome.lensRuntime.activeReviewLens).toBe('startup');
    expect(result.decision.tool.name).toBe('Acme');
    expect(result.decision.hasApi).toBe(true);
    expect(result.navigation.categorySlug).toBe('project-management');
  });
});
