import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  buildToolPageCuratedVerdictRowLimit,
  fetchToolPageCuratedVerdicts,
} from '@/lib/tool-page/curated-verdicts';

function createQueryMock(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
  };
}

describe('fetchToolPageCuratedVerdicts', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('keeps first encountered verdict per alternative from ordered rows', async () => {
    const forwardQuery = createQueryMock([
      {
        item_a_slug: 'acme',
        item_b_slug: 'beta',
        verdict: 'newer verdict',
        updated_at: '2026-03-05T00:00:00Z',
      },
      {
        item_a_slug: 'acme',
        item_b_slug: 'beta',
        verdict: 'older verdict',
        updated_at: '2026-02-01T00:00:00Z',
      },
    ]);
    const reverseQuery = createQueryMock([
      {
        item_a_slug: 'gamma',
        item_b_slug: 'acme',
        verdict: 'gamma verdict',
        updated_at: '2026-03-04T00:00:00Z',
      },
    ]);

    fromMock.mockImplementationOnce(() => forwardQuery).mockImplementationOnce(() => reverseQuery);

    const result = await fetchToolPageCuratedVerdicts('acme', ['beta', 'gamma']);

    expect(result.get('beta')).toBe('newer verdict');
    expect(result.get('gamma')).toBe('gamma verdict');
    expect(result.size).toBe(2);
    expect(forwardQuery.order).toHaveBeenCalledWith('updated_at', {
      ascending: false,
      nullsFirst: false,
    });
    expect(forwardQuery.limit).toHaveBeenCalledWith(20);
  });

  it('returns empty map for no alternatives', async () => {
    const result = await fetchToolPageCuratedVerdicts('acme', []);
    expect(result.size).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('applies bounded row-limit policy', () => {
    expect(buildToolPageCuratedVerdictRowLimit(0)).toBe(20);
    expect(buildToolPageCuratedVerdictRowLimit(2)).toBe(20);
    expect(buildToolPageCuratedVerdictRowLimit(10)).toBe(30);
    expect(buildToolPageCuratedVerdictRowLimit(200)).toBe(300);
  });
});
