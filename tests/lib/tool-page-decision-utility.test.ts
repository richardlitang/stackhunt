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

  it('uses subject-specific checklist and verdict lead for product surfaces', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'GitHub Actions',
      categorySlug: 'developer-tools',
      resolvedSubjectType: 'product_surface',
      resolvedEntityScope: 'actions',
      activeReviewLens: 'startup',
      hasApi: true,
      hasParentTool: true,
      hasEnterpriseSignals: false,
      lensBestFitLine: 'Best for CI workflows.',
      lensWeakFitLine: 'Weak fit for teams with strict procurement-only controls.',
      lensTradeoffLine: 'Tradeoff is velocity versus governance depth.',
      hardLimitText: 'Advanced controls require higher tiers.',
      pricingEvidenceSourceUrl: 'https://example.com/pricing',
      pricingEvidenceSummary: 'Plan-gated CI minutes and controls.',
      lowConfidenceMode: false,
    });

    expect(result.testChecklistItems[0]).toMatch(/surface only/i);
    expect(result.verdictLeadOverride).toMatch(/specific product surface/i);
    expect(
      result.pricingMentalModelItems.some((item) => /exact product surface/i.test(item.text))
    ).toBe(true);
  });

  it('uses subject-specific plan-family guidance when plan family is resolved', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'GitHub Enterprise',
      categorySlug: 'developer-tools',
      resolvedSubjectType: 'plan_family',
      resolvedEntityScope: null,
      activeReviewLens: 'enterprise',
      hasApi: true,
      hasParentTool: true,
      hasEnterpriseSignals: true,
      lensBestFitLine: 'Best for governance-heavy orgs.',
      lensWeakFitLine: 'Weak fit for self-serve solo buyers.',
      lensTradeoffLine: 'Tradeoff is governance depth versus seat cost.',
      hardLimitText: 'Enterprise controls are plan-gated.',
      pricingEvidenceSourceUrl: 'https://example.com/pricing',
      pricingEvidenceSummary: 'Seat minimums and annual commitments.',
      lowConfidenceMode: false,
    });

    expect(result.testChecklistItems[0]).toMatch(/exact plans/i);
    expect(result.verdictLeadOverride).toMatch(/exact plan fit/i);
    expect(result.pricingMentalModelItems.some((item) => /plan mismatch/i.test(item.text))).toBe(
      true
    );
  });

  it('uses subject-specific deployment pricing guidance for deployment-mode subjects', () => {
    const result = buildToolPageDecisionUtilityState({
      toolName: 'Acme Deploy',
      categorySlug: 'developer-tools',
      resolvedSubjectType: 'deployment_mode',
      resolvedEntityScope: 'enterprise_server',
      activeReviewLens: 'enterprise',
      hasApi: true,
      hasParentTool: false,
      hasEnterpriseSignals: true,
      lensBestFitLine: 'Best fit for teams that need environment control.',
      lensWeakFitLine: 'Weak fit for teams that need self-serve onboarding.',
      lensTradeoffLine: 'Tradeoff is control versus operational ownership.',
      hardLimitText: 'Self-hosted mode requires dedicated infrastructure ownership.',
      pricingEvidenceSourceUrl: 'https://example.com/pricing',
      pricingEvidenceSummary: 'Deployment mode and support tiers affect cost.',
      lowConfidenceMode: false,
    });

    expect(
      result.pricingMentalModelItems.some((item) =>
        /self-hosted\/server deployment/i.test(item.text)
      )
    ).toBe(true);
  });
});
