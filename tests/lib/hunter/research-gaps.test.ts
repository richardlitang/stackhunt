import { describe, expect, it } from 'vitest';
import { buildGapQueries, detectSourceLaneGaps } from '@/lib/hunter/coverage/research-gaps';

const source = (snippet: string) => ({
  url: `https://example.com/${snippet.length}`,
  title: '',
  snippet,
});

describe('detectSourceLaneGaps', () => {
  it('reports all lanes when sources have no lane signals', () => {
    expect(detectSourceLaneGaps([source('a nice tool for notes')])).toEqual([
      'onboarding',
      'pricing_ceilings',
      'migration_risk',
      'support_quality',
    ]);
  });

  it('does not report a lane that a source snippet covers', () => {
    const gaps = detectSourceLaneGaps([source('pricing starts at $10 per seat')]);
    expect(gaps).not.toContain('pricing_ceilings');
  });
});

describe('buildGapQueries', () => {
  it('builds one query per gap, capped at 4, mentioning the tool', () => {
    const queries = buildGapQueries('Linear', [
      'onboarding',
      'pricing_ceilings',
      'migration_risk',
      'support_quality',
    ]);
    expect(queries).toHaveLength(4);
    expect(queries.every((query) => query.includes('Linear'))).toBe(true);
  });

  it('returns empty for no gaps', () => {
    expect(buildGapQueries('Linear', [])).toEqual([]);
  });
});
