import { describe, expect, it } from 'vitest';
import { buildToolPageLowConfidenceSourcesState } from '@/lib/tool-page/evidence/low-confidence-sources';

describe('tool page low confidence sources state', () => {
  it('shows low-confidence box when count is positive', () => {
    const result = buildToolPageLowConfidenceSourcesState({ count: 3 });
    expect(result.show).toBe(true);
    expect(result.title).toBe('Low-confidence secondary sources (3)');
  });

  it('hides low-confidence box when count is zero', () => {
    const result = buildToolPageLowConfidenceSourcesState({ count: 0 });
    expect(result.show).toBe(false);
  });
});
