import { describe, expect, it } from 'vitest';
import { isToolPagePaymentsCategoryHint } from '@/lib/tool-page/shared/category-hints';

describe('tool page category hints', () => {
  it('detects payments-related category hints', () => {
    expect(isToolPagePaymentsCategoryHint('payments', 'reconciliation')).toBe(true);
    expect(isToolPagePaymentsCategoryHint('operations', 'banking automation')).toBe(true);
  });

  it('does not detect unrelated categories', () => {
    expect(isToolPagePaymentsCategoryHint('project-management', 'roadmapping')).toBe(false);
  });
});
