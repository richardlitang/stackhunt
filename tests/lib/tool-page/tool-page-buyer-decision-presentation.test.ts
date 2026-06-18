import { describe, expect, it } from 'vitest';
import type { ToolPageBuyerDecisionLayer } from '@/types/tool-page-blueprint';
import { buildToolPageBuyerDecisionPresentationState } from '@/lib/tool-page/decision/buyer-decision-presentation';

function makeLayer(
  overrides: Partial<ToolPageBuyerDecisionLayer> = {}
): ToolPageBuyerDecisionLayer {
  return {
    heroDecisionCard: {
      bestFor: null,
      notFor: null,
      mainRisk: null,
      upgradeTrigger: null,
      implementationFriction: {
        level: 'unknown',
        summary: null,
        drivers: [],
        stakeholders: [],
      },
      evidence: {
        evidenceType: 'unknown',
        confidence: 'low',
        lastChecked: null,
        sourceUrl: null,
      },
    },
    fitMatrix: {
      solo: null,
      startup: null,
      midMarket: null,
      enterprise: null,
    },
    pricingReality: {
      freeWorksIf: null,
      paidNeededWhen: null,
      hiddenCostTriggers: [],
      mainCostDrivers: [],
      evidence: {
        evidenceType: 'unknown',
        confidence: 'low',
        lastChecked: null,
        sourceUrl: null,
      },
    },
    beforeYouBuyTests: [],
    alternativesRebuttals: [],
    compactTrustStrip: {
      status: 'Needs confirmation',
      confidence: 'Low',
      lastChecked: null,
      pendingCount: 0,
    },
    toolbar: {
      activeLens: 'general',
      lensHrefs: {
        general: '/tool/acme',
        personal: '/tool/acme?lens=personal',
        startup: '/tool/acme?lens=startup',
        enterprise: '/tool/acme?lens=enterprise',
      },
      jumpLinks: [],
    },
    ...overrides,
  };
}

describe('tool page buyer decision presentation state', () => {
  it('uses the structured buyer decision card as the canonical verdict when decision slots exist', () => {
    const result = buildToolPageBuyerDecisionPresentationState({
      layer: makeLayer({
        heroDecisionCard: {
          ...makeLayer().heroDecisionCard,
          bestFor: 'Product teams that want opinionated issue tracking.',
          notFor: 'Teams that need a general-purpose work management suite.',
          mainRisk: 'Non-engineering teams may reject the workflow.',
          upgradeTrigger: 'SSO and admin controls become mandatory.',
        },
      }),
      hasSourcesSection: true,
    });

    expect(result.showHeroDecisionCard).toBe(true);
    expect(result.hasCanonicalDecisionSnapshot).toBe(true);
    expect(result.showLegacyVerdictNarrative).toBe(false);
    expect(result.showVerdictSourcesLink).toBe(true);
    expect(result.verdictAnchorTarget).toBe('decision-snapshot');
  });

  it('treats partial structured decision data as the rendered verdict to avoid duplicate UI', () => {
    const result = buildToolPageBuyerDecisionPresentationState({
      layer: makeLayer({
        heroDecisionCard: {
          ...makeLayer().heroDecisionCard,
          bestFor: 'Engineering teams that want strict issue workflows.',
          mainRisk: 'Non-engineering adoption may lag.',
        },
      }),
      hasSourcesSection: false,
    });

    expect(result.showHeroDecisionCard).toBe(true);
    expect(result.hasCanonicalDecisionSnapshot).toBe(true);
    expect(result.showLegacyVerdictNarrative).toBe(false);
    expect(result.showVerdictSourcesLink).toBe(false);
  });

  it('keeps the legacy verdict narrative when structured decision data is incomplete', () => {
    const result = buildToolPageBuyerDecisionPresentationState({
      layer: makeLayer(),
      hasSourcesSection: false,
    });

    expect(result.showHeroDecisionCard).toBe(false);
    expect(result.hasCanonicalDecisionSnapshot).toBe(false);
    expect(result.showLegacyVerdictNarrative).toBe(true);
    expect(result.verdictAnchorTarget).toBe('verdict');
  });

  it('does not show the hero decision card for stakeholder-only implementation metadata', () => {
    const result = buildToolPageBuyerDecisionPresentationState({
      layer: makeLayer({
        heroDecisionCard: {
          ...makeLayer().heroDecisionCard,
          implementationFriction: {
            level: 'medium',
            summary: null,
            drivers: [],
            stakeholders: ['Operations'],
          },
        },
      }),
      hasSourcesSection: false,
    });

    expect(result.showHeroDecisionCard).toBe(false);
    expect(result.showLegacyVerdictNarrative).toBe(true);
  });

  it('suppresses generic pricing mental model copy when pricing reality has structured latest-data signals', () => {
    const result = buildToolPageBuyerDecisionPresentationState({
      layer: makeLayer({
        pricingReality: {
          ...makeLayer().pricingReality,
          freeWorksIf: 'Free works for small teams testing core issue tracking.',
          paidNeededWhen: 'Paid is needed for admin controls and higher limits.',
          hiddenCostTriggers: ['SSO', 'workspace expansion'],
        },
      }),
      hasSourcesSection: false,
    });

    expect(result.hasStructuredPricingReality).toBe(true);
    expect(result.showLegacyPricingMentalModel).toBe(false);
  });
});
