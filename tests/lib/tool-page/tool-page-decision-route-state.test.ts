import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision/decision-route-state';

describe('tool page decision route state', () => {
  it('builds decision utility, pricing scenario, and early-snapshot banner state', () => {
    const result = buildToolPageDecisionRouteState({
      tool: {
        name: 'Acme',
        categorySlug: 'crm-sales',
        pricingType: 'enterprise',
      },
      resolvedSubject: {
        subjectType: 'product_surface',
        entityScope: 'acme-platform',
      },
      activeReviewLens: 'startup',
      hasApi: true,
      hasParentTool: false,
      audienceSlugs: ['startup', 'sales'],
      lensBestFitLine: 'Best for teams replacing spreadsheets.',
      lensWeakFitLine: 'Weak fit for offline-heavy workflows.',
      lensTradeoffLine: 'Tradeoff is setup rigor vs reporting consistency.',
      topLensHardLimit: {
        text: 'No offline mode',
        sourceUrl: 'https://example.com/docs',
      },
      pricingEvidenceSourceUrl: 'https://example.com/pricing',
      pricingEvidenceSummary: 'Paid plans gate advanced reporting',
      contentConfidenceLabel: 'Low',
      trustBar: {
        confidence: 'Medium',
        pendingCount: 2,
      },
    });

    expect(result.decisionUtilityState.verdictLeadOverride).toBeTruthy();
    expect(result.pricingScenarioState.examples.length).toBeGreaterThan(0);
    expect(result.decisionHardLimitEvidence?.text).toBe('No offline mode');
    expect(result.showEarlySnapshotToneBanner).toBe(true);
  });
});
