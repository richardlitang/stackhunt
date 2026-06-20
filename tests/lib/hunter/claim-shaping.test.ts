import { describe, it, expect } from 'vitest';
import {
  enforceDecisionUsefulClaim,
  rewriteLowSpecificityClaim,
} from '@/lib/hunter/content-policy/claim-shaping';

describe('claim shaping never produces double-clause Frankenstein copy', () => {
  it('does not prefix a claim that already contains a clause verb', () => {
    const out = enforceDecisionUsefulClaim(
      'reports indicate constraints or workflow limits',
      'cons',
      'community'
    );
    expect(out).not.toMatch(/block teams that require reports indicate/i);
    expect(out).not.toMatch(/that require .* indicate/i);
  });

  it('drops (returns empty) a claim too generic to shape, instead of stitching', () => {
    expect(rewriteLowSpecificityClaim('great tool', 'pros', 'community')).toBe('');
  });

  it('leaves an already decision-shaped claim untouched', () => {
    const c = 'Best for teams that need native API access on the free tier.';
    expect(enforceDecisionUsefulClaim(c, 'pros', 'official')).toBe(c);
  });
});
