import { describe, expect, it } from 'vitest';
import { buildToolPageCategoryRef } from '@/lib/tool-page/category-ref';

describe('tool page category ref', () => {
  it('returns normalized category when slug and name are strings', () => {
    expect(
      buildToolPageCategoryRef({ slug: 'project-management', name: 'Project Management' })
    ).toEqual({
      slug: 'project-management',
      name: 'Project Management',
    });
  });

  it('returns null for invalid or missing category values', () => {
    expect(buildToolPageCategoryRef(null)).toBeNull();
    expect(buildToolPageCategoryRef({ slug: 'project-management' })).toBeNull();
    expect(buildToolPageCategoryRef({ name: 'Project Management' })).toBeNull();
    expect(buildToolPageCategoryRef({ slug: 5, name: 'Project Management' })).toBeNull();
  });
});
