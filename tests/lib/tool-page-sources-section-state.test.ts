import { describe, expect, it } from 'vitest';
import { buildToolPageSourcesSectionState } from '@/lib/tool-page/sources-section-state';

describe('tool page sources section state', () => {
  it('shows sources section when evidence basis has entries', () => {
    expect(buildToolPageSourcesSectionState({ evidenceBasisCount: 1 }).hasSources).toBe(true);
  });

  it('hides sources section when evidence basis is empty', () => {
    expect(buildToolPageSourcesSectionState({ evidenceBasisCount: 0 }).hasSources).toBe(false);
  });
});
