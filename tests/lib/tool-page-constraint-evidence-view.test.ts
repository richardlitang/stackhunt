import { describe, expect, it } from 'vitest';
import { buildToolPageConstraintEvidenceView } from '@/lib/tool-page/constraint-evidence-view';

describe('tool page constraint evidence view', () => {
  it('projects constraint evidence bullets into typed view arrays', () => {
    const result = buildToolPageConstraintEvidenceView({
      hiddenCostBullets: [{ text: 'Hidden cost', sourceUrl: 'https://example.com/cost' }],
      hardLimitFromConstraints: [{ text: 'Hard limit', sourceUrl: 'https://example.com/limit' }],
    } as any);

    expect(result.hiddenCostBullets.length).toBe(1);
    expect(result.hardLimitFromConstraints.length).toBe(1);
    expect(result.hardLimitFromConstraints[0].text).toBe('Hard limit');
  });
});
