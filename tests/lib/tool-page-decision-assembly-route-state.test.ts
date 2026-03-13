import { describe, expect, it } from 'vitest';
import {
  buildToolPageDecisionAssemblyRouteState,
  buildToolPageDecisionAssemblyRouteStateFromRouteContext,
} from '@/lib/tool-page/decision-assembly-route-state';

describe('tool page decision assembly route state', () => {
  it('assembles and delegates decision route state from route-level inputs', () => {
    const result = buildToolPageDecisionAssemblyRouteState({
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

  it('builds decision state from route context inputs', () => {
    const result = buildToolPageDecisionAssemblyRouteStateFromRouteContext({
      tool: {
        name: 'Acme',
        categorySlug: 'crm-sales',
        pricingType: 'enterprise',
      },
      resolvedSubject: {
        subjectType: 'product_surface',
        entityScope: 'core',
      },
      activeReviewLens: 'startup',
      hasApi: true,
      hasParentTool: false,
      audiences: [{ slug: 'startup' }, { name: 'Sales Ops' }],
      lensBestFitLine: 'Best for teams replacing spreadsheets.',
      lensWeakFitLine: 'Weak fit for offline-heavy workflows.',
      lensTradeoffLine: 'Tradeoff is setup rigor vs reporting consistency.',
      topLensHardLimit: {
        text: 'No offline mode',
        sourceUrl: 'https://example.com/docs',
      },
      pricingEvidenceLinks: [{ sourceUrl: 'https://example.com/pricing', text: 'Pro plans add SSO' }],
      officialPricingSourceUrl: 'https://example.com/official-pricing',
      contentConfidenceLabel: 'Low',
      trustBar: {
        confidence: 'Medium',
        pendingCount: 2,
      },
    });

    expect(result.pricingScenarioState.examples.length).toBeGreaterThan(0);
    expect(result.decisionUtilityState.verdictLeadOverride).toBeTruthy();
  });
});
