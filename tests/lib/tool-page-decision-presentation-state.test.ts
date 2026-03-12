import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionPresentationState } from '@/lib/tool-page/decision-presentation-state';

describe('tool page decision presentation state', () => {
  it('derives workflow visibility, decision utility visibility, and quick-jump filtering', () => {
    const result = buildToolPageDecisionPresentationState({
      categorySlug: 'project-management',
      workflowFitCardsCount: 0,
      workflowFitHighlightsCount: 0,
      decisionUtilityState: {
        hasEvidenceAnchoredUtility: true,
        testChecklistItems: ['Create one pilot workflow'],
        commonSetups: [],
        practicalOutcomes: ['Faster onboarding consistency'],
      } as never,
      prosConsView: {
        userSignalPros: [{ text: 'Users report better handoff' }],
        userSignalCons: [],
      } as never,
      quickJumpLinks: [
        { href: '#workflow-fit', label: 'Rollout checkpoints' },
        { href: '#pricing-plans', label: 'Pricing' },
      ],
    });

    expect(result.showWorkflowFitSection).toBe(false);
    expect(result.shouldShowDecisionUtilitySection).toBe(true);
    expect(result.shouldShowPracticalOutcomes).toBe(true);
    expect(result.hasUserSignalProsCons).toBe(true);
    expect(result.quickJumpLinksView.map((entry) => entry.href)).toEqual(['#pricing-plans']);
  });
});
