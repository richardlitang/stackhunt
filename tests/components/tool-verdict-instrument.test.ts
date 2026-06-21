import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const componentSource = fs.readFileSync(
  path.resolve(testDir, '../../src/components/tool-page/ToolVerdictInstrument.astro'),
  'utf8'
);

describe('ToolVerdictInstrument structure', () => {
  it('renders the score, verdict, decision slots, and one freshness line', () => {
    expect(componentSource).toContain('verdict.score');
    expect(componentSource).toContain('font-mono');
    expect(componentSource).toContain('verdict.scoreLabel');
    expect(componentSource).toContain('verdict.recommendationTerm');
    expect(componentSource).toContain('verdict.verdictLine');
    expect(componentSource).toContain('Best for');
    expect(componentSource).toContain('Not for');
    expect(componentSource).toContain('Main risk');
    expect(componentSource).toContain('Upgrade trigger');
    expect(componentSource).toContain('verdict.freshnessLine');
  });

  it('keeps the visit action visually secondary and exposes score meaning to assistive tech', () => {
    const visitLink = componentSource.match(/<a[\s\S]*?data-verdict-visit[\s\S]*?>/)?.[0] || '';

    expect(visitLink).not.toContain('bg-signal');
    expect(visitLink).not.toMatch(/bg-amber/);
    expect(componentSource).toContain('aria-label={scoreAriaLabel}');
    expect(componentSource).toContain('focus-visible:ring-2');
  });
});
