import { describe, expect, it } from 'vitest';
import { buildToolPagePricingEvidenceState } from '@/lib/tool-page/pricing-evidence-state';

describe('tool page pricing evidence state', () => {
  it('shows panel when official source exists', () => {
    expect(
      buildToolPagePricingEvidenceState({ hasOfficialPricingSource: true, pricingEvidenceCount: 0 }).hasEvidencePanel
    ).toBe(true);
  });

  it('hides panel when no official source and no pricing links', () => {
    expect(
      buildToolPagePricingEvidenceState({ hasOfficialPricingSource: false, pricingEvidenceCount: 0 }).hasEvidencePanel
    ).toBe(false);
  });
});
