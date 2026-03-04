import { describe, expect, it } from 'vitest';
import { buildToolPageStrengthsSubtitle } from '@/lib/tool-page/strengths-subtitle';

describe('tool page strengths subtitle', () => {
  it('shows evidence-backed copy when there are source-backed pros/cons', () => {
    expect(buildToolPageStrengthsSubtitle({ prosConsSourcesCount: 1 })).toBe(
      'Evidence-backed pros and cons only.'
    );
  });

  it('shows waiting copy when source-backed pros/cons are missing', () => {
    expect(buildToolPageStrengthsSubtitle({ prosConsSourcesCount: 0 })).toBe(
      'Pros and cons will appear after source-backed claims are collected.'
    );
  });
});
