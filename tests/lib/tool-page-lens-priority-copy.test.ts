import { describe, expect, it } from 'vitest';
import { buildToolPageLensPriorityLead } from '@/lib/tool-page/lens-priority-copy';

describe('tool page lens priority lead copy', () => {
  it('uses generic lead for general lens', () => {
    expect(buildToolPageLensPriorityLead({ activeReviewLens: 'general', activeLensLabel: 'General' })).toBe(
      'Start with these sections:'
    );
  });

  it('uses lens-specific lead for non-general lens', () => {
    expect(buildToolPageLensPriorityLead({ activeReviewLens: 'enterprise', activeLensLabel: 'Enterprise' })).toBe(
      'For Enterprise teams, start here:'
    );
  });
});
