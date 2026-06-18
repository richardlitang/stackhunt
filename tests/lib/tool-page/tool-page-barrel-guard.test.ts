import { describe, expect, it } from 'vitest';
import {
  collectToolPageBarrelExports,
  findDuplicateToolPageBarrelExports,
} from '../../../scripts/lib/tool-page-barrel-guard.mjs';

describe('tool page barrel guard', () => {
  it('collects exported symbols grouped by source module', () => {
    const source = `
export { buildToolPageA, deriveToolPageB } from '@/lib/tool-page/a';
export { buildToolPageC } from '@/lib/tool-page/c';
`;
    const exportMap = collectToolPageBarrelExports(source);
    expect(exportMap.get('buildToolPageA')).toEqual(['@/lib/tool-page/a']);
    expect(exportMap.get('deriveToolPageB')).toEqual(['@/lib/tool-page/a']);
    expect(exportMap.get('buildToolPageC')).toEqual(['@/lib/tool-page/c']);
  });

  it('finds duplicate exported symbols across modules', () => {
    const source = `
export { buildToolPageA } from '@/lib/tool-page/a';
export { buildToolPageA } from '@/lib/tool-page/b';
`;
    const duplicates = findDuplicateToolPageBarrelExports(source);
    expect(duplicates).toEqual([
      {
        symbol: 'buildToolPageA',
        modules: ['@/lib/tool-page/a', '@/lib/tool-page/b'],
      },
    ]);
  });

  it('returns empty list when all exports are unique', () => {
    const source = `
export { buildToolPageA } from '@/lib/tool-page/a';
export { deriveToolPageB } from '@/lib/tool-page/b';
`;
    expect(findDuplicateToolPageBarrelExports(source)).toEqual([]);
  });
});
