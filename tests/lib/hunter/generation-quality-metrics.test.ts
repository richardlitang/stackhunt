import { describe, expect, it } from 'vitest';
import {
  computeActionabilityScore,
  computeReaderUtilityScore,
} from '@/lib/hunter/generation-quality-metrics';

describe('generation quality metrics', () => {
  it('computes actionability score from constraints, numbers, and structure signals', () => {
    const score = computeActionabilityScore(
      ['Free plan up to 3 seats', 'SSO is only available on enterprise plans'],
      {
        vetoCount: 1,
        switchingCount: 1,
        dealbreakerCount: 1,
        abstainedCount: 0,
        distinctDomains: 4,
      }
    );

    expect(score).toBe(83);
  });

  it('applies abstention penalties to actionability score', () => {
    const score = computeActionabilityScore(['Supports API access'], {
      vetoCount: 0,
      switchingCount: 0,
      dealbreakerCount: 0,
      abstainedCount: 10,
      distinctDomains: 1,
    });

    expect(score).toBe(0);
  });

  it('computes reader utility score with scenario and consequence-rich signals', () => {
    const score = computeReaderUtilityScore({
      claimTexts: [
        'If your team needs strict approvals, this plan limit can block rollout.',
        'When budget is tight, overage risk can force a switch to another tier.',
      ],
      decisionIntro: {
        best_for: 'Teams with predictable spend',
        not_for: 'Teams requiring granular controls on free tier',
        main_tradeoff: 'Lower entry price, but meaningful plan gating',
      },
      userAdvocate: {
        avoidIf: ['You need advanced controls on day one'],
        frustrations: ['Surprise overages'],
        idealFor: ['Finance-led teams'],
      },
      vetoCount: 1,
      realityCheckCount: 1,
      abstainedCount: 0,
    });

    expect(score).toBe(100);
  });

  it('applies abstention penalties to reader utility score', () => {
    const score = computeReaderUtilityScore({
      claimTexts: ['If you need controls, this can be a blocker.'],
      decisionIntro: null,
      userAdvocate: null,
      vetoCount: 0,
      realityCheckCount: 0,
      abstainedCount: 6,
    });

    expect(score).toBe(25);
  });
});
