import { describe, expect, it } from 'vitest';
import { buildToolPageProsConsView } from '@/lib/tool-page/pros-cons-view';

describe('tool page pros/cons view', () => {
  it('maps evidence bullets to ProsCons component shape', () => {
    const result = buildToolPageProsConsView({
      pros: [{ text: 'Fast setup', sourceUrl: 'https://docs.example.com/setup' }],
      cons: [{ text: 'Steep learning curve', sourceUrl: null }],
    });

    expect(result).toEqual({
      pros: [{ text: 'Fast setup', source_url: 'https://docs.example.com/setup' }],
      cons: [{ text: 'Steep learning curve', source_url: null }],
    });
  });
});
