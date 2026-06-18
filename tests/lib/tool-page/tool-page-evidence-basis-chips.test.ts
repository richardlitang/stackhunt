import { describe, expect, it } from 'vitest';
import { buildToolPageEvidenceBasisChips } from '@/lib/tool-page/evidence/evidence-basis-chips';

describe('tool page evidence basis chips', () => {
  it('formats chip labels with counts', () => {
    const result = buildToolPageEvidenceBasisChips({
      evidenceBasis: [
        { label: 'Official docs', count: 3 },
        { label: 'Pricing', count: 1 },
      ],
    });

    expect(result).toEqual([{ text: 'Official docs (3)' }, { text: 'Pricing (1)' }]);
  });
});
