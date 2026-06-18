import { describe, expect, it } from 'vitest';
import { buildToolPageVerdictContent } from '@/lib/tool-page/decision/verdict-content';

describe('tool page verdict content', () => {
  it('falls back to empty body when verdict markdown is missing', () => {
    expect(buildToolPageVerdictContent({ renderVerdictSafe: null }).body).toBe('');
  });

  it('uses provided verdict markdown', () => {
    expect(buildToolPageVerdictContent({ renderVerdictSafe: 'Verdict text' }).body).toBe(
      'Verdict text'
    );
  });

  it('removes source-placeholder verdict copy', () => {
    const result = buildToolPageVerdictContent({
      renderVerdictSafe:
        'Choose when Best for teams that need supports core workflows, with plan limits and feature constraints documented in the source.. Avoid when exports are limited.',
    });

    expect(result.body).not.toContain('supports core workflows');
    expect(result.body).toContain('Avoid when exports are limited.');
  });
});
