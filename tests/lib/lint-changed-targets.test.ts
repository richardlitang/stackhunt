import { describe, expect, it } from 'vitest';
import { selectLintTargets } from '../../scripts/lib/lint-changed-targets.mjs';

describe('lint changed targets', () => {
  it('includes only lintable files under allowed roots', () => {
    const changed = [
      'src/pages/tool/[slug].astro',
      'scripts/check-lint-changed.mjs',
      'tests/lib/example.test.ts',
      'tools/helper.js',
      'docs/guide.md',
      'README.md',
      'src/styles/main.css',
    ];

    const selected = selectLintTargets(changed, () => true);
    expect(selected).toEqual([
      'src/pages/tool/[slug].astro',
      'scripts/check-lint-changed.mjs',
      'tests/lib/example.test.ts',
      'tools/helper.js',
    ]);
  });

  it('excludes files that do not exist', () => {
    const changed = ['src/a.ts', 'src/b.ts'];
    const selected = selectLintTargets(changed, (file) => file === 'src/a.ts');
    expect(selected).toEqual(['src/a.ts']);
  });
});
