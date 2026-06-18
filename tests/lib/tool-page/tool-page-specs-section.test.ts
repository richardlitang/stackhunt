import { describe, expect, it } from 'vitest';
import { buildToolPageSpecsSectionState } from '@/lib/tool-page/presentation/specs-section';

describe('tool page specs section state', () => {
  it('builds checked lead when label exists', () => {
    expect(buildToolPageSpecsSectionState({ specsVerifiedLabel: 'yesterday' }).checkedLead).toBe(
      'Specs checked yesterday'
    );
  });

  it('returns null checked lead when label missing', () => {
    expect(buildToolPageSpecsSectionState({ specsVerifiedLabel: null }).checkedLead).toBeNull();
  });
});
