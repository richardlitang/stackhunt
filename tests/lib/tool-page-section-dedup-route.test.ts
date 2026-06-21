import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(
  path.resolve(testDir, '../../src/pages/tool/[slug].astro'),
  'utf8'
);

describe('tool page section deduplication', () => {
  it('renders one pros and cons path with user signals merged into it', () => {
    expect(routeSource.match(/<ProsCons\b/g)).toHaveLength(1);
    expect(routeSource).toContain('mergedProsConsView');
    expect(routeSource).not.toContain('User-Reported Signals');
    expect(routeSource).not.toContain('What Users Report');
  });

  it('keeps only the alternatives compare grid', () => {
    expect(routeSource).toContain('<AlternativesCompareGrid');
    expect(routeSource).not.toContain('AlternativeCard');
    expect(routeSource).not.toContain('Rebuttal angle:');
  });

  it('gates methodology on real review evidence', () => {
    expect(routeSource).not.toContain('const hasHowWeEvaluatedSection = true');
    expect(routeSource).toMatch(/hasHowWeEvaluatedSection\s*&&\s*\(\s*<ToolHowWeEvaluateSection/);
  });
});
