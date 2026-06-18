import { describe, expect, it } from 'vitest';
import {
  countEligibleEvidenceDomains,
  isBlockedEvidenceDomain,
  isEligibleEvidenceUrl,
} from '@/lib/tool-page/evidence/evidence-policy';

describe('tool page evidence policy', () => {
  it('blocks known low-trust evidence domains including subdomains', () => {
    expect(isBlockedEvidenceDomain('reddit.com')).toBe(true);
    expect(isBlockedEvidenceDomain('m.reddit.com')).toBe(true);
    expect(isBlockedEvidenceDomain('community.stackexchange.com')).toBe(true);
    expect(isBlockedEvidenceDomain('docs.example.com')).toBe(false);
  });

  it('accepts valid non-blocked URLs and rejects invalid/blocked URLs', () => {
    expect(isEligibleEvidenceUrl('https://example.com/docs')).toBe(true);
    expect(isEligibleEvidenceUrl('https://news.ycombinator.com/item?id=1')).toBe(false);
    expect(isEligibleEvidenceUrl('not-a-url')).toBe(false);
    expect(isEligibleEvidenceUrl(null)).toBe(false);
  });

  it('counts only eligible evidence domains', () => {
    const domains = new Set(['reddit.com', 'docs.example.com', 'blog.example.com', 'g2.com']);
    expect(countEligibleEvidenceDomains(domains)).toBe(2);
  });
});
