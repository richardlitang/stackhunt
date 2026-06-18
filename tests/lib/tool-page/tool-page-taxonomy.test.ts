import { describe, expect, it } from 'vitest';
import { buildToolPagePrimaryFunction } from '@/lib/tool-page/presentation/taxonomy';

describe('tool page taxonomy helpers', () => {
  it('returns normalized primary function from specs taxonomy', () => {
    expect(
      buildToolPagePrimaryFunction({
        specs: { taxonomy: { primary_function: '  CRM  ' } },
      })
    ).toBe('CRM');
  });

  it('returns null for missing primary function', () => {
    expect(buildToolPagePrimaryFunction({ specs: null })).toBeNull();
    expect(buildToolPagePrimaryFunction({ specs: {} })).toBeNull();
  });
});
