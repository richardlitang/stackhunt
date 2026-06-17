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
        whyItMatters: 'Matters most when this directly improves a workflow you run every day.',
        whatToDo: 'Daily workflow test',
        passCondition: 'The workflow completes without role, plan, or handoff blockers.',
        commonFailure: 'A key step depends on a gated feature, hidden limit, or missing ownership.',
        evidence: {
          evidenceType: 'editorial_inference',
          confidence: 'medium',
          lastChecked: '2026-03-20',
        },
      },
      {
        testType: 'daily_workflow',
        name: 'Daily workflow test',
        whyItMatters: 'Matters most when this directly improves a workflow you run every day.',
        whatToDo: 'Daily workflow test',
        passCondition: 'The workflow completes without role, plan, or handoff blockers.',
        commonFailure: 'A key step depends on a gated feature, hidden limit, or missing ownership.',
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
        chooseInsteadIf: 'Workflow fit is stronger for your team than Acme.',
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
    expect(result.beforeYouBuyTests).toHaveLength(0);
    expect(result.fitMatrix.solo).toBeNull();
    expect(result.fitMatrix.startup).toBeNull();
    expect(result.alternativesRebuttals).toHaveLength(0);
  });

  it('suppresses source-placeholder decision and before-you-buy copy', () => {
    const genericCopy =
      'Best for teams that need supports core workflows, with plan limits and feature constraints documented in the source.';
    const result = enforceToolPageDecisionLayerIntegrity({
      layer: {
        ...buildBaseLayer(),
        heroDecisionCard: {
          ...buildBaseLayer().heroDecisionCard,
          bestFor: null,
          notFor: null,
          mainRisk: genericCopy,
          upgradeTrigger: genericCopy,
          implementationFriction: {
            level: 'medium',
            summary: 'Estimated setup time: minutes.',
            drivers: [genericCopy, genericCopy],
            stakeholders: ['Operations'],
          },
        },
        beforeYouBuyTests: [
          {
            testType: 'daily_workflow',
            name: 'Daily workflow test',
            whyItMatters: genericCopy,
            whatToDo: genericCopy,
            passCondition: 'The workflow passes without plan, ownership, or permission blockers.',
            commonFailure:
              'A critical step depends on an unsupported tier, integration, or control model.',
            evidence: {
              evidenceType: 'editorial_inference',
              confidence: 'medium',
              lastChecked: '2026-03-20',
            },
          },
        ],
      },
    });

    expect(result.heroDecisionCard.mainRisk).toBeNull();
    expect(result.heroDecisionCard.upgradeTrigger).toBeNull();
    expect(result.heroDecisionCard.implementationFriction.summary).toBeNull();
    expect(result.heroDecisionCard.implementationFriction.drivers).toEqual([]);
    expect(result.beforeYouBuyTests).toEqual([]);
  });
});
