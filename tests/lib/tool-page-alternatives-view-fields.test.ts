import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesViewFields } from '@/lib/tool-page/alternatives-view-fields';

describe('tool page alternatives view fields', () => {
  it('maps alternatives state into route-friendly view fields', () => {
    const result = buildToolPageAlternativesViewFields({
      comparableAlternatives: [{ slug: 'stripe' } as any],
      hasComparableAlternatives: true,
      canCompareBySlug: { stripe: true, asana: false },
    });

    expect(result.hasComparableAlternatives).toBe(true);
    expect(result.comparableAlternatives[0].slug).toBe('stripe');
    expect(result.canCompareByAlternativeSlug.asana).toBe(false);
  });
});
