import { describe, expect, it } from 'vitest';
import { buildToolPagePresentationGates } from '@/lib/tool-page/presentation-gates';

describe('tool page presentation gates', () => {
  it('shows procedural sections only when guidance is enabled and section is procedural', () => {
    const result = buildToolPagePresentationGates({
      hasProceduralGuidance: true,
      sectionStatus: {
        verdict: 'procedural',
        specs: 'show',
      },
      hasVerdict: false,
      hasSpecs: false,
    });

    expect(result.showProceduralVerdict).toBe(true);
    expect(result.showProceduralSpecs).toBe(false);
  });

  it('suppresses procedural section when canonical section already has content', () => {
    const result = buildToolPagePresentationGates({
      hasProceduralGuidance: true,
      sectionStatus: {
        verdict: 'procedural',
        specs: 'procedural',
      },
      hasVerdict: true,
      hasSpecs: true,
    });

    expect(result.showProceduralVerdict).toBe(false);
    expect(result.showProceduralSpecs).toBe(false);
  });
});
