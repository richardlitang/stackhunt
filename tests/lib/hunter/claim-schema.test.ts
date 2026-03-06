import { describe, expect, it } from 'vitest';
import { ClaimWithSourceSchema } from '@/lib/hunter/types';

describe('hunter claim schema', () => {
  it('accepts optional claim confidence fields', () => {
    const parsed = ClaimWithSourceSchema.parse({
      text: 'Users report handoff friction between pipeline stages.',
      source_url: 'https://www.reddit.com/r/sales/comments/abc123/thread',
      source_type: 'community',
      claim_type: 'opinion',
      claim_confidence_score: 0.72,
      claim_confidence_tier: 'medium',
    });

    expect(parsed.claim_confidence_score).toBe(0.72);
    expect(parsed.claim_confidence_tier).toBe('medium');
  });

  it('rejects invalid claim confidence score values', () => {
    const result = ClaimWithSourceSchema.safeParse({
      text: 'Official docs list a minimum seat requirement for this tier.',
      source_url: 'https://example.com/pricing',
      source_type: 'official',
      claim_type: 'fact',
      claim_confidence_score: 1.4,
      claim_confidence_tier: 'high',
    });

    expect(result.success).toBe(false);
  });
});
