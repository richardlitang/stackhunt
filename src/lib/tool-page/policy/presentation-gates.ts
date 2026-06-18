import type { ToolPageSectionMode } from '@/lib/tool-page/policy/standard';

interface BuildToolPagePresentationGatesInput {
  hasProceduralGuidance: boolean;
  sectionStatus: {
    verdict: ToolPageSectionMode;
    specs: ToolPageSectionMode;
  };
  hasVerdict: boolean;
  hasSpecs: boolean;
}

export function buildToolPagePresentationGates(input: BuildToolPagePresentationGatesInput): {
  showProceduralVerdict: boolean;
  showProceduralSpecs: boolean;
} {
  return {
    showProceduralVerdict:
      input.hasProceduralGuidance &&
      input.sectionStatus.verdict === 'procedural' &&
      !input.hasVerdict,
    showProceduralSpecs:
      input.hasProceduralGuidance && input.sectionStatus.specs === 'procedural' && !input.hasSpecs,
  };
}
