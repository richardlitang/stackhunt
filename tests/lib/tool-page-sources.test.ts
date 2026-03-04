import { describe, expect, it } from 'vitest';
import { buildToolPageSourcesViewModel } from '@/lib/tool-page/sources';

describe('tool page sources', () => {
  it('returns zero counts when no valid source URLs exist', () => {
    const result = buildToolPageSourcesViewModel({
      evidenceLinksAll: [{ url: null }],
      effectiveEvidencePros: [{ sourceUrl: null }],
      effectiveEvidenceCons: [{ sourceUrl: 'not-a-url' }],
      pricingSourceUrl: null,
      pricingEvidenceLinks: [],
      faqItems: [],
      officialDocsSourceUrl: null,
      canonicalHardLimits: [],
    });

    expect(result.collectedSourcesBySection).toEqual({
      pros_cons: 0,
      pricing: 0,
      faq: 0,
      specs: 0,
    });
    expect(result.collectedSourcesTotal).toBe(0);
    expect(result.hasCollectedSources).toBe(false);
  });

  it('deduplicates urls across sections and strips query/hash', () => {
    const result = buildToolPageSourcesViewModel({
      evidenceLinksAll: [{ url: 'https://acme.com/docs?ref=a#top' }],
      effectiveEvidencePros: [{ sourceUrl: 'https://acme.com/docs?ref=b' }],
      effectiveEvidenceCons: [{ sourceUrl: 'https://acme.com/limits' }],
      pricingSourceUrl: 'https://acme.com/pricing?plan=pro',
      pricingEvidenceLinks: [{ sourceUrl: 'https://acme.com/pricing#faq' }],
      faqItems: [{ answer_source_url: 'https://acme.com/help/articles/1' }],
      officialDocsSourceUrl: 'https://acme.com/docs',
      canonicalHardLimits: [{ sourceUrl: 'https://acme.com/limits?foo=1' }],
    });

    expect(result.collectedSourcesBySection).toEqual({
      pros_cons: 2,
      pricing: 1,
      faq: 1,
      specs: 2,
    });
    expect(result.collectedSourcesTotal).toBe(4);
    expect(result.hasCollectedSources).toBe(true);
  });
});
