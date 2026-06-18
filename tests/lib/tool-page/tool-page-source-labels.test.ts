import { describe, expect, it } from 'vitest';
import {
  buildToolPageSourceAriaLabel,
  clampToolPageSourceContext,
  formatToolPageVerifiedDate,
} from '@/lib/tool-page/evidence/source-labels';

describe('tool page source labels', () => {
  it('formats valid dates and returns null for invalid values', () => {
    expect(formatToolPageVerifiedDate('2026-03-04T00:00:00.000Z')).toBe('Mar 4, 2026');
    expect(formatToolPageVerifiedDate('bad-date')).toBeNull();
    expect(formatToolPageVerifiedDate(null)).toBeNull();
  });

  it('clamps long context and preserves short context', () => {
    expect(clampToolPageSourceContext('Quick claim')).toBe('Quick claim');
    expect(clampToolPageSourceContext('   ')).toBe('this claim');
    const long = 'x'.repeat(120);
    expect(clampToolPageSourceContext(long)).toHaveLength(90);
    expect(clampToolPageSourceContext(long).endsWith('...')).toBe(true);
  });

  it('builds aria labels from clamped context', () => {
    expect(buildToolPageSourceAriaLabel('A short claim')).toBe(
      'Open source evidence for A short claim'
    );
  });
});
