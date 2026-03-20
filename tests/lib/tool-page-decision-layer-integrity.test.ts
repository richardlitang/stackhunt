import { describe, expect, it } from 'vitest';
import { enforceToolPageDecisionLayerIntegrity } from '@/lib/tool-page/decision-layer-integrity';
import type { ToolPageBuyerDecisionLayer } from '@/types/tool-page-blueprint';

function buildBaseLayer(): ToolPageBuyerDecisionLayer {
  return {
    heroDecisionCard: {
      bestFor: 'Teams that need reliable approval workflows.',
      notFor: 'Teams that need deep custom policy engines.',
      mainRisk: 'That need enterprise controls without rollout planning.',
      upgradeTrigger: 'When approval limits block the default process.',
      implementationFriction: {
        level: 'high',
        summary: '[object Object]',
        drivers: ['Role mapping', 'Role mapping'],
        stakeholders: ['Security', 'Operations'],
      },
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: '2026-03-20',
      },
    },
    fitMatrix: {
      solo: {
        fit: 'mixed',
        reason: 'Works for small pilots.',
        caveat: 'Admin overhead can spike.',
        evidence: {
          evidenceType: 'editorial_inference',
          confidence: 'medium',
          lastChecked: '2026-03-20',
        },
      },
      startup: {
        fit: 'mixed',
        reason: 'Works for small pilots.',
        caveat: 'Admin overhead can spike.',
        evidence: {
          evidenceType: 'editorial_inference',
          confidence: 'medium',
          lastChecked: '2026-03-20',
        },
      },
      midMarket: null,
      enterprise: null,
    },
    pricingReality: {
      freeWorksIf: 'Free works for pilot workflows.',
      paidNeededWhen: 'Free works for pilot workflows.',
      hiddenCostTriggers: ['Seat growth', 'Seat growth'],
      mainCostDrivers: ['Per-seat pricing'],
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: '2026-03-20',
      },
    },
    beforeYouBuyTests: [
      {
        testType: 'daily_workflow',
        name: 'Daily workflow test',
        whyItMatters: 'Validates core flow.',
        whatToDo: 'Run one full workflow.',
        passCondition: 'No manual workaround.',
        commonFailure: 'Role mismatch.',
        evidence: {
          evidenceType: 'editorial_inference',
          confidence: 'medium',
          lastChecked: '2026-03-20',
        },
      },
      {
        testType: 'daily_workflow',
        name: 'Daily workflow test',
        whyItMatters: 'Validates core flow.',
        whatToDo: 'Run one full workflow.',
        passCondition: 'No manual workaround.',
        commonFailure: 'Role mismatch.',
        evidence: {
          evidenceType: 'editorial_inference',
          confidence: 'medium',
          lastChecked: '2026-03-20',
        },
      },
    ],
    alternativesRebuttals: [
      {
        slug: 'allowed-alt',
        toolName: 'Allowed Alt',
        chooseInsteadIf: 'Stricter governance controls are mandatory.',
        differentiator: 'Stronger governance',
        confidence: 'high',
      },
      {
        slug: 'blocked-alt',
        toolName: 'Blocked Alt',
        chooseInsteadIf: 'Faster setup is the only priority.',
        differentiator: 'Faster setup',
        confidence: 'medium',
      },
    ],
    compactTrustStrip: {
      status: 'Source-backed',
      confidence: 'High',
      lastChecked: '2026-03-20',
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
  };
}

describe('tool page decision layer integrity', () => {
  it('cleans malformed values and suppresses duplicate fit matrix rows', () => {
    const result = enforceToolPageDecisionLayerIntegrity({
      layer: buildBaseLayer(),
      allowedAlternativeSlugs: ['allowed-alt'],
    });

    expect(result.heroDecisionCard.mainRisk).toBeNull();
    expect(result.heroDecisionCard.implementationFriction.summary).toContain(
      'High rollout friction'
    );
    expect(result.pricingReality.paidNeededWhen).toBeNull();
    expect(result.beforeYouBuyTests).toHaveLength(1);
    expect(result.fitMatrix.solo).toBeNull();
    expect(result.fitMatrix.startup).toBeNull();
    expect(result.alternativesRebuttals).toHaveLength(1);
    expect(result.alternativesRebuttals[0]?.slug).toBe('allowed-alt');
  });
});
