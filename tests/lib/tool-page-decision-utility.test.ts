import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionUtilityState } from '@/lib/tool-page/decision-utility';

describe('tool page decision utility state', () => {
  it('suppresses generic utility sections when low-confidence mode lacks evidence anchors', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Acme Tool',
      categorySlug: 'project-management',
      activeReviewLens: 'general',
      hasApi: false,
      hasParentTool: false,
      hasEnterpriseSignals: false,
      lensBestFitLine: 'Best for teams that need lightweight planning.',
      lensWeakFitLine: 'Weak fit for compliance-heavy rollouts.',
      lensTradeoffLine: 'Tradeoff is simplicity versus depth.',
      hardLimitText: null,
      pricingEvidenceSourceUrl: null,
      pricingEvidenceSummary: null,
      lowConfidenceMode: true,
    });

    expect(result.pricingMentalModelItems).toEqual([]);
    expect(result.commonSetups).toEqual([]);
    expect(result.practicalOutcomes).toEqual([]);
    expect(result.verdictLeadOverride).toMatch(/early signals/i);
  });

  it('keeps utility sections when evidence anchors exist even in low-confidence mode', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Acme Tool',
      categorySlug: 'crm-sales',
      activeReviewLens: 'startup',
      hasApi: true,
      hasParentTool: false,
      hasEnterpriseSignals: false,
      lensBestFitLine: 'Best for teams scaling SDR handoffs.',
      lensWeakFitLine: 'Weak fit for teams needing strict governance now.',
      lensTradeoffLine: 'Tradeoff is velocity versus governance depth.',
      hardLimitText: 'Advanced controls require higher-tier plans.',
      pricingEvidenceSourceUrl: 'https://example.com/pricing',
      pricingEvidenceSummary: 'Seat-based pricing with plan-gated automation.',
      lowConfidenceMode: true,
    });

    expect(result.pricingMentalModelItems.length).toBeGreaterThan(0);
    expect(result.commonSetups.length).toBeGreaterThan(0);
    expect(result.practicalOutcomes.length).toBeGreaterThan(0);
  });
});
