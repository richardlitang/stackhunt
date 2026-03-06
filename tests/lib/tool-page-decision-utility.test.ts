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
    expect(
      result.testChecklistItems.some((item) => item.includes('first paid-seat threshold'))
    ).toBe(true);
    expect(result.verdictLeadOverride).toContain('fits startups');
    expect(result.commonSetups).toHaveLength(3);
    expect(result.practicalOutcomesTitle).toBe('What it does in practice');
    expect(result.practicalOutcomes[0]?.planDependencyStatus).toBe('Needs confirmation');
    expect(result.pricingMentalModelItems[0]?.status).toBe('Source-backed');
    expect(result.pricingMentalModelItems[0]?.evidenceHref).toBe('#verdict');
  });

  it('adds solo-specific checklist and verdict lead for personal lens', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Attio',
      categorySlug: 'crm-sales',
      activeReviewLens: 'personal',
      lensBestFitLine: 'Solo operators who can own setup.',
      lensWeakFitLine: 'Teams needing prebuilt defaults.',
      lensTradeoffLine: 'Flexibility vs setup overhead.',
      hardLimitText: 'Free plan capped at 3 seats.',
    });

    expect(
      result.testChecklistItems.some((item) => item.includes('before inviting a second user'))
    ).toBe(true);
    expect(result.verdictLeadOverride).toContain('individual operator');
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
    expect(result.practicalOutcomes[0]?.planDependencyStatus).toBe('Needs confirmation');
    expect(
      result.pricingMentalModelItems.every((item) => item.status === 'Needs confirmation')
    ).toBe(true);
  });
});
