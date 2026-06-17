import { describe, it, expect, vi } from 'vitest';
import { mapToolIndexEntry } from '@/pages/api/search/tool-index';

// Mock supabase to avoid environment variable requirement during test import
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

describe('mapToolIndexEntry', () => {
  it('maps a row to a decision-aware index entry', () => {
    const entry = mapToolIndexEntry({
      id: '1',
      name: 'Linear',
      slug: 'linear',
      logo_url: 'linear.app',
      short_description: 'Issue tracker',
      avg_score: 92,
      verdict: '  Worth it if you live in your tracker.  ',
    });
    expect(entry).toEqual({
      id: '1',
      name: 'Linear',
      slug: 'linear',
      logo_url: 'linear.app',
      short_description: 'Issue tracker',
      score: '92',
      verdict: 'Worth it if you live in your tracker.',
    });
  });
  it('nulls out missing score and empty verdict', () => {
    const entry = mapToolIndexEntry({
      id: '2',
      name: 'X',
      slug: 'x',
      logo_url: null,
      short_description: null,
      avg_score: 0,
      verdict: null,
    });
    expect(entry.score).toBeNull();
    expect(entry.verdict).toBe('');
  });
});
