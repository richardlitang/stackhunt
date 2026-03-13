import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision-navigation-route-state';

describe('tool page decision navigation route state', () => {
  it('combines navigation slices with decision presentation view state', () => {
    const result = buildToolPageDecisionNavigationRouteState({
      navigationState: {
        sourcesSectionState: { hasSources: true },
        lowConfidenceSourcesState: { show: false, title: 'Low-confidence secondary sources (0)' },
        faqItemsView: [{ question: 'Q1', answer: 'A1', answer_source_url: null, hasSourceLink: false }],
        updateHistoryState: { hasUpdates: true },
        quickJumpLinks: [{ href: '#verdict', label: 'Verdict', key: 'verdict' }],
      },
      categorySlug: 'project-management',
      workflowFitCardsCount: 1,
      workflowFitHighlightsCount: 0,
      decisionUtilityState: {
        hasEvidenceAnchoredUtility: true,
        testChecklistItems: ['Run pilot'],
        commonSetups: [],
        practicalOutcomes: ['Shorter onboarding time'],
      } as Parameters<typeof buildToolPageDecisionNavigationRouteState>[0]['decisionUtilityState'],
      prosConsView: {
        userSignalPros: [{ text: 'Fast setup' }],
        userSignalCons: [],
      } as Parameters<typeof buildToolPageDecisionNavigationRouteState>[0]['prosConsView'],
    });

    expect(result.sourcesSectionState.hasSources).toBe(true);
    expect(result.hasUserSignalProsCons).toBe(true);
    expect(result.shouldShowDecisionUtilitySection).toBe(true);
    expect(result.quickJumpLinksView.length).toBe(1);
  });
});
