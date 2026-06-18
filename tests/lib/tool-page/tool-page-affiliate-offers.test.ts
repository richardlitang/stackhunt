import { describe, expect, it } from 'vitest';
import { buildToolPageAffiliateOffersView } from '@/lib/tool-page/pricing/affiliate-offers';

describe('tool page affiliate offers view', () => {
  it('shows section when there are at least two offers and maps rel policy', () => {
    const result = buildToolPageAffiliateOffersView({
      offers: [
        { url: 'https://a.example', cta_text: 'Buy', is_affiliate: true },
        { url: 'https://b.example', cta_text: 'Try free', is_affiliate: false },
      ],
    });

    expect(result.shouldShow).toBe(true);
    expect(result.offers[0].rel).toContain('nofollow sponsored');
    expect(result.offers[1].rel).toBe('noopener noreferrer');
  });
});
