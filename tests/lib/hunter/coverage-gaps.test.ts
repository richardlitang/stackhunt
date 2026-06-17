import { describe, expect, it } from 'vitest';
import { detectCoverageGaps } from '@/lib/hunter/coverage/coverage-gaps';

describe('detectCoverageGaps (characterization)', () => {
  it('reports all four gaps for an empty analysis', () => {
    expect(detectCoverageGaps({}, {})).toEqual([
      'onboarding',
      'pricing_ceilings',
      'migration_risk',
      'support_quality',
    ]);
  });

  it('treats smp_pricing plans on the knowledge card as pricing coverage', () => {
    const gaps = detectCoverageGaps({}, { smp_pricing: { plans: [] } });
    expect(gaps).not.toContain('pricing_ceilings');
  });

  it('treats setup_complexity tier as onboarding coverage', () => {
    const gaps = detectCoverageGaps({}, { setup_complexity: { tier: 'low' } });
    expect(gaps).not.toContain('onboarding');
  });
});
