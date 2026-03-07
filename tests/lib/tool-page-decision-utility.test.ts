import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionUtilityState } from '@/lib/tool-page/decision-utility';

describe('tool page decision utility', () => {
  it('builds CRM-specific checklist and setups for crm category', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Attio',
      categorySlug: 'crm-sales',
      activeReviewLens: 'startup',
      hasApi: false,
      hasParentTool: false,
      hasEnterpriseSignals: false,
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
    expect(result.commonSetups[0]?.costTrigger?.status).toBe('Source-backed');
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
      hasApi: false,
      hasParentTool: false,
      hasEnterpriseSignals: false,
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
      hasApi: false,
      hasParentTool: false,
      hasEnterpriseSignals: false,
      lensBestFitLine: '',
      lensWeakFitLine: '',
      lensTradeoffLine: '',
      hardLimitText: null,
    });

    expect(result.testChecklistTitle).toBe('What to test before rollout');
    expect(result.testChecklistItems).toHaveLength(0);
    expect(result.commonSetups).toHaveLength(0);
    expect(result.hasEvidenceAnchoredUtility).toBe(false);
    expect(result.decisionWatchOut).toContain('Watch out');
    expect(result.practicalOutcomes).toHaveLength(0);
    expect(
      result.pricingMentalModelItems.every((item) => item.status === 'Needs confirmation')
    ).toBe(true);
  });

  it('marks pricing mental model items as source-backed when pricing evidence is available', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Attio',
      categorySlug: 'crm-sales',
      activeReviewLens: 'startup',
      hasApi: false,
      hasParentTool: false,
      hasEnterpriseSignals: false,
      lensBestFitLine: 'Startups that can own CRM ops.',
      lensWeakFitLine: 'Teams needing preconfigured CRM setup.',
      lensTradeoffLine: 'Flexibility vs setup overhead.',
      hardLimitText: null,
      pricingEvidenceSourceUrl: 'https://attio.com/pricing',
      pricingEvidenceSummary: 'Pricing tiers vary by seats and plan capabilities.',
    });

    expect(result.pricingMentalModelItems[0]?.status).toBe('Source-backed');
    expect(result.pricingMentalModelItems[0]?.evidenceHref).toBe('#pricing');
    expect(
      result.pricingMentalModelItems.some(
        (item) => item.status === 'Source-backed' && item.text.includes('tiers vary')
      )
    ).toBe(true);
  });

  it('uses API-first checklist for developer/API archetype tools', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Claude',
      categorySlug: 'developer-tools',
      activeReviewLens: 'enterprise',
      hasApi: true,
      hasParentTool: false,
      hasEnterpriseSignals: true,
      lensBestFitLine: 'Developer teams with API-first workflows.',
      lensWeakFitLine: 'Teams needing turnkey workflow software.',
      lensTradeoffLine: 'Flexibility vs implementation ownership.',
      hardLimitText: 'Usage limits vary by plan and demand.',
    });

    expect(result.testChecklistItems[0]).toContain('production-like API workflow');
    expect(result.testChecklistItems[1]).toContain('auth');
    expect(result.hasEvidenceAnchoredUtility).toBe(true);
  });

  it('dedupes repeated pricing mental model bullets', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Acme',
      categorySlug: 'ai-automation',
      activeReviewLens: 'general',
      hasApi: true,
      hasParentTool: false,
      hasEnterpriseSignals: false,
      lensBestFitLine: 'Best fit',
      lensWeakFitLine: 'Weak fit',
      lensTradeoffLine: 'Tradeoff',
      hardLimitText: 'No free trial available for paid tiers.',
      pricingEvidenceSummary: 'No free trial available for paid tiers.',
      pricingEvidenceSourceUrl: 'https://example.com/pricing',
    });

    const normalized = result.pricingMentalModelItems.map((item) =>
      item.text.toLowerCase().replace(/\s+/g, ' ').trim()
    );
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it('softens decision bullets in low-confidence mode', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Acme',
      categorySlug: 'crm-sales',
      activeReviewLens: 'general',
      hasApi: false,
      hasParentTool: false,
      hasEnterpriseSignals: false,
      lensBestFitLine: 'Use for flexible pipeline workflows.',
      lensWeakFitLine: 'Avoid for strict turnkey requirements.',
      lensTradeoffLine: 'Flexibility vs setup overhead.',
      hardLimitText: null,
      lowConfidenceMode: true,
    });

    expect(result.decisionUseIf).toContain('Early signal');
    expect(result.decisionAvoidIf).toContain('Evidence still evolving');
    expect(result.decisionWatchOut).toContain('Pending claims remain');
  });
});
