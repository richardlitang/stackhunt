import { describe, expect, it } from 'vitest';
import { buildToolPageVerdictContent } from '@/lib/tool-page/verdict-content';

describe('tool page verdict content', () => {
  it('falls back to empty body when verdict markdown is missing', () => {
    expect(buildToolPageVerdictContent({ renderVerdictSafe: null }).body).toBe('');
  });

  it('uses provided verdict markdown', () => {
    expect(buildToolPageVerdictContent({ renderVerdictSafe: 'Verdict text' }).body).toBe('Verdict text');
  });
});
