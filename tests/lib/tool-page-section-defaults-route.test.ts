import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(testDir, '../../src/pages/tool/[slug].astro'), 'utf8');

function detailsTagFor(id: string): string {
  return source.match(new RegExp(`<details(?=[^>]*id="${id}")[^>]*>`))?.[0] || '';
}

function detailsTagBefore(text: string): string {
  const textIndex = source.indexOf(text);
  const detailsIndex = source.lastIndexOf('<details', textIndex);
  return source.slice(detailsIndex, source.indexOf('>', detailsIndex) + 1);
}

describe('tool page section defaults', () => {
  it('opens decision-critical pricing and strengths sections', () => {
    expect(detailsTagFor('pricing-plans')).toMatch(/\sopen(?:\s|>)/);
    expect(detailsTagFor('strengths')).toMatch(/\sopen(?:\s|>)/);
  });

  it('keeps reference sections collapsed', () => {
    expect(detailsTagFor('about')).not.toMatch(/\sopen(?:\s|>)/);
    expect(detailsTagBefore('Operational details')).not.toMatch(/\sopen(?:\s|>)/);
  });
});
