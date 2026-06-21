import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../..');
const templatePaths = [
  'src/pages/tool/[slug].astro',
  'src/components/TrustBar.astro',
  'src/components/ToolCompactTrustStrip.astro',
  'src/components/ToolHowWeEvaluateSection.astro',
  'src/components/PricingPlansGrid.astro',
];

function templateMarkup(relativePath: string): string {
  const source = fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8');
  return source.split('---').slice(2).join('---');
}

describe('tool page hedge-copy guard', () => {
  it.each(templatePaths)('%s does not render banned hedge labels', (relativePath) => {
    expect(templateMarkup(relativePath)).not.toMatch(
      /Pending verification|Data confidence|Not confirmed|Evaluation depth|validated against source documentation|Needs confirmation/i
    );
  });
});
