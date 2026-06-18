import { describe, expect, it } from 'vitest';
import { buildToolPageVerificationBadgeLabel } from '@/lib/tool-page/presentation/verification-badge';

describe('tool page verification badge label', () => {
  it('uses source-specific label when sources are collected', () => {
    expect(buildToolPageVerificationBadgeLabel({ hasCollectedSources: true })).toBe(
      'Verified sources'
    );
  });

  it('uses generic label when sources are not collected', () => {
    expect(buildToolPageVerificationBadgeLabel({ hasCollectedSources: false })).toBe('Verified');
  });
});
