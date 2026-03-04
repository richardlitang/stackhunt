import { describe, expect, it } from 'vitest';
import { buildToolPageUpdateHistoryState } from '@/lib/tool-page/update-history-state';

describe('tool page update history state', () => {
  it('shows updates when entries exist', () => {
    expect(buildToolPageUpdateHistoryState({ entriesCount: 2 }).hasUpdates).toBe(true);
  });

  it('hides updates when no entries exist', () => {
    expect(buildToolPageUpdateHistoryState({ entriesCount: 0 }).hasUpdates).toBe(false);
  });
});
