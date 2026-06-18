import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesSectionState } from '@/lib/tool-page/alternatives/alternatives-section';

describe('tool page alternatives section state', () => {
  it('builds category view-all href when category exists', () => {
    const result = buildToolPageAlternativesSectionState({
      category: { slug: 'crm', name: 'CRM' },
    });

    expect(result.viewAllHref).toBe('/categories/crm');
  });

  it('returns null href when category is missing', () => {
    const result = buildToolPageAlternativesSectionState({ category: null });
    expect(result.viewAllHref).toBeNull();
  });
});
