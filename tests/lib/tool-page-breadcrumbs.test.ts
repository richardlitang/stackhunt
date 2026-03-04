import { describe, expect, it } from 'vitest';
import { buildToolPageCategoryBreadcrumb } from '@/lib/tool-page/breadcrumbs';

describe('tool page breadcrumbs', () => {
  it('builds category breadcrumb when slug and name exist', () => {
    const result = buildToolPageCategoryBreadcrumb({
      category: { slug: 'analytics', name: 'Analytics' },
    });

    expect(result).toEqual({
      href: '/categories/analytics',
      label: 'Analytics',
    });
  });

  it('returns null when category is missing', () => {
    expect(buildToolPageCategoryBreadcrumb({ category: null })).toBeNull();
  });
});
