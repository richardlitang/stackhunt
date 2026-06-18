import { describe, expect, it } from 'vitest';
import { buildToolPageTrustBarProps } from '@/lib/tool-page/evidence/trust-bar-props';

describe('tool page trust bar props', () => {
  it('returns pass-through props for TrustBar', () => {
    const result = buildToolPageTrustBarProps({
      status: 'Source-backed',
      pendingCount: 2,
      evaluationDepth: 'Deep hands-on',
      lastChecked: '2 days ago',
      confidence: 'High',
      sourcesCount: 14,
    });

    expect(result).toEqual({
      status: 'Source-backed',
      pendingCount: 2,
      evaluationDepth: 'Deep hands-on',
      lastChecked: '2 days ago',
      confidence: 'High',
      sourcesCount: 14,
    });
  });
});
