import { describe, expect, it } from 'vitest';
import { generateToolPageOrchestrationMapMarkdown } from '../../scripts/lib/tool-page-orchestration-map.mjs';

describe('tool page orchestration map', () => {
  it('generates map with key sections', () => {
    const markdown = generateToolPageOrchestrationMapMarkdown(process.cwd());
    expect(markdown).toContain('# Tool Page Orchestration Map');
    expect(markdown).toContain('## Route Composition Order');
    expect(markdown).toContain('## Tool-Page Imports Used by Route');
    expect(markdown).toContain('## One-Level Helper Dependencies');
  });

  it('includes current pipeline and assembly helpers in route map', () => {
    const markdown = generateToolPageOrchestrationMapMarkdown(process.cwd());
    expect(markdown).toContain('buildToolPageDecisionEvidenceRouteState');
    expect(markdown).toContain('buildToolPageDisplayRouteState');
    expect(markdown).toContain('buildToolPageRuntimeMidRouteState');
    expect(markdown).toContain('buildToolPagePageAssemblyRouteStateFromRouteContext');
  });

  it('does not leave unresolved route imports in the map', () => {
    const markdown = generateToolPageOrchestrationMapMarkdown(process.cwd());
    expect(markdown).not.toContain('`unmapped`');
  });
});
