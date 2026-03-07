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

  it('includes community corroboration count when present', () => {
    expect(
      buildToolPageStrengthsSubtitle({ prosConsSourcesCount: 3, communityCorroborationCount: 2 })
    ).toBe('Evidence-backed pros and cons only, with 2 corroborating community domains.');
  });

  it('includes user-reported signal count when present', () => {
    expect(
      buildToolPageStrengthsSubtitle({
        prosConsSourcesCount: 3,
        communityCorroborationCount: 2,
        userSignalClaimsCount: 4,
      })
    ).toBe(
      'Evidence-backed pros and cons only, with 2 corroborating community domains and 4 user-reported signals.'
    );
  });
});
