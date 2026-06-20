import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(
  path.resolve(testDir, '../../src/pages/tool/[slug].astro'),
  'utf8'
);

describe('tool page verdict instrument route integration', () => {
  it('mounts the canonical instrument and removes duplicate verdict paths', () => {
    expect(routeSource).toContain(
      "import ToolVerdictInstrument from '@/components/tool-page/ToolVerdictInstrument.astro'"
    );
    expect(routeSource).toContain('resolveToolVerdict({');
    expect(routeSource).toContain('<ToolVerdictInstrument');
    expect(routeSource).not.toContain('ToolImmediateVerdictCard');
    expect(routeSource).not.toContain('showLegacyVerdictNarrative');
    expect(routeSource).not.toContain('showVerdictEvidenceNotesOnly');
  });

  it('keeps hero actions secondary and removes the filled affiliate CTA', () => {
    expect(routeSource).not.toContain('AffiliateButton');
    expect(routeSource).not.toContain('data-location="sidebar-cta"');
    expect(routeSource).toContain('<CompareButton');
    expect(routeSource).toContain('<AddToStackButton');
  });
});
