import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionUtilityState } from '@/lib/tool-page/decision-utility';

describe('tool page decision utility', () => {
  it('builds CRM-specific checklist and setups for crm category', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Attio',
      categorySlug: 'crm-sales',
      activeReviewLens: 'startup',
      lensBestFitLine: 'Startups that can own CRM ops.',
      lensWeakFitLine: 'Teams needing preconfigured CRM setup.',
      lensTradeoffLine: 'Flexibility vs setup overhead.',
      hardLimitText: 'Free plan capped at 3 seats.',
    });

    expect(result.testChecklistTitle).toBe('What to test in 30 minutes');
    expect(result.testChecklistItems[0]).toContain('Import a sample CSV');
    expect(result.commonSetups).toHaveLength(3);
    expect(result.practicalOutcomesTitle).toBe('What it does in practice');
  });

  it('builds generic fallback for non-CRM categories', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Notion',
      categorySlug: 'project-management',
      activeReviewLens: 'general',
      lensBestFitLine: '',
      lensWeakFitLine: '',
      lensTradeoffLine: '',
      hardLimitText: null,
    });

    expect(result.testChecklistTitle).toBe('What to test before rollout');
    expect(result.testChecklistItems[0]).toContain('Run one complete high-frequency workflow');
    expect(result.commonSetups).toHaveLength(3);
    expect(result.decisionWatchOut).toContain('Watch out');
  });
});
