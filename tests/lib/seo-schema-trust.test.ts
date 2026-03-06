import { describe, expect, it } from 'vitest';

import { generateContextReviewSchemas, generateReviewSchema, generateToolSchema } from '@/lib/seo';

describe('SEO schema trust metadata', () => {
  it('adds last-modified metadata to SoftwareApplication schema', () => {
    const tool = {
      name: 'Attio',
      slug: 'attio',
      website: 'https://attio.com',
      short_description: 'CRM for modern sales teams',
      category: { name: 'CRM' },
      metadata: null,
      logo_url: null,
      pricing_type: 'freemium',
      avg_score: 0,
      review_count: 0,
      updated_at: '2026-03-05T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    } as any;

    const schema = generateToolSchema(tool);
    expect(schema.dateModified).toBe('2026-03-05T00:00:00Z');
  });

  it('adds methodology and review freshness metadata to Review schema', () => {
    const tool = {
      name: 'Attio',
      slug: 'attio',
      website: 'https://attio.com',
      created_at: '2026-01-01T00:00:00Z',
    } as any;
    const review = {
      score: 82,
      summary_markdown: 'Strong fit for teams that can own CRM operations.',
      created_at: '2026-02-20T00:00:00Z',
      updated_at: '2026-03-04T00:00:00Z',
    } as any;

    const schema = generateReviewSchema(tool, review, 'CRM software');

    expect(schema.isBasedOn).toContain('/methodology');
    expect(schema.mainEntityOfPage).toContain('/tool/attio');
    expect(schema.datePublished).toBe('2026-02-20T00:00:00Z');
    expect(schema.dateModified).toBe('2026-03-04T00:00:00Z');
  });

  it('does not fabricate publish dates for context review schemas', () => {
    const reviewSchemas = generateContextReviewSchemas('CRM software', [
      {
        item: {
          name: 'Attio',
          slug: 'attio',
          website: 'https://attio.com',
          logo_url: null,
          short_description: 'CRM for modern sales teams',
        } as any,
        score: 80,
      },
    ]);

    expect(reviewSchemas[0]).not.toHaveProperty('datePublished');
    expect(reviewSchemas[0]).not.toHaveProperty('dateModified');
    expect(reviewSchemas[0].isBasedOn).toContain('/methodology');
  });
});
