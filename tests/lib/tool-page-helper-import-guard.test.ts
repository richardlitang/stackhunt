import { describe, expect, it } from 'vitest';
import {
  collectNamedImports,
  collectToolPageHelperCallSites,
  collectToolPageHelperUsages,
  collectToolPageImportsFromBlock,
  collectToolPageLocalDeclarations,
  findMissingToolPageImports,
  findUnboundToolPageHelperCalls,
} from '../../scripts/lib/tool-page-helper-import-guard.mjs';

const fixture = `
import {
  buildToolPageA,
  deriveToolPageB,
  applyToolPageC,
  getToolPageD,
} from '@/lib/tool-page';

const x = buildToolPageA();
const y = deriveToolPageB();
const z = hasToolPageE();
const q = isToolPageF();
`;

const unboundFixture = `
import {
  buildToolPageA,
} from '@/lib/tool-page';
import { unrelatedFn } from '@/lib/utils';

const x = buildToolPageA();
const y = buildToolPageTrustBarProps();
function deriveToolPageReviewContextSignals() {
  return null;
}
const z = deriveToolPageReviewContextSignals();
`;

const commentStringFixture = `
import {
  buildToolPageA,
} from '@/lib/tool-page';
// buildToolPageTrustBarProps()
const text = "deriveToolPageReviewContextSignals()";
const x = buildToolPageA();
`;

const inlineImportFixture = `
import { buildToolPageA, deriveToolPageB } from '@/lib/tool-page';
const x = buildToolPageA();
const y = deriveToolPageB();
`;

const precedingNamedImportsFixture = `
import { generateToolMeta } from '@/lib/seo';
import { simpleMarkdown } from '@/lib/utils';
import {
  buildToolPageA,
  deriveToolPageB,
} from '@/lib/tool-page';
const x = buildToolPageA();
const y = deriveToolPageB();
`;

describe('tool page helper import guard', () => {
  it('collects helper usages across allowed prefixes', () => {
    const used = collectToolPageHelperUsages(fixture);
    expect(used.has('buildToolPageA')).toBe(true);
    expect(used.has('deriveToolPageB')).toBe(true);
    expect(used.has('hasToolPageE')).toBe(true);
    expect(used.has('isToolPageF')).toBe(true);
  });

  it('collects imports from @/lib/tool-page block', () => {
    const imported = collectToolPageImportsFromBlock(fixture);
    expect(imported.has('buildToolPageA')).toBe(true);
    expect(imported.has('deriveToolPageB')).toBe(true);
    expect(imported.has('applyToolPageC')).toBe(true);
    expect(imported.has('getToolPageD')).toBe(true);
  });

  it('reports missing helper imports', () => {
    const missing = findMissingToolPageImports(fixture);
    expect(missing).toEqual(['hasToolPageE', 'isToolPageF']);
  });

  it('collects helper call sites and local declarations', () => {
    const callSites = collectToolPageHelperCallSites(unboundFixture);
    const namedImports = collectNamedImports(unboundFixture);
    const localDeclarations = collectToolPageLocalDeclarations(unboundFixture);

    expect(callSites.has('buildToolPageA')).toBe(true);
    expect(callSites.has('buildToolPageTrustBarProps')).toBe(true);
    expect(namedImports.has('buildToolPageA')).toBe(true);
    expect(localDeclarations.has('deriveToolPageReviewContextSignals')).toBe(true);
  });

  it('reports unbound helper call symbols', () => {
    const missing = findUnboundToolPageHelperCalls(unboundFixture);
    expect(missing).toEqual(['buildToolPageTrustBarProps']);
  });

  it('ignores comment/string helper-like tokens for usage and call-site checks', () => {
    expect(findMissingToolPageImports(commentStringFixture)).toEqual([]);
    expect(findUnboundToolPageHelperCalls(commentStringFixture)).toEqual([]);
  });

  it('supports inline @/lib/tool-page named imports', () => {
    const imported = collectToolPageImportsFromBlock(inlineImportFixture);
    expect(imported.has('buildToolPageA')).toBe(true);
    expect(imported.has('deriveToolPageB')).toBe(true);
  });

  it('targets the @/lib/tool-page block when other named imports precede it', () => {
    const imported = collectToolPageImportsFromBlock(precedingNamedImportsFixture);
    expect(imported.has('buildToolPageA')).toBe(true);
    expect(imported.has('deriveToolPageB')).toBe(true);
  });
});
