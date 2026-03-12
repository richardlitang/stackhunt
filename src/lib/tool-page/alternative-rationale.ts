interface AlternativeRationaleDiff {
  priceDiff?: string;
  learningDiff?: string;
  featureDiff?: string;
}

interface BuildAlternativeChooseLineInput {
  altName: string;
  mainName: string;
  curatedVerdict?: string | null;
  computedDiff?: AlternativeRationaleDiff | null;
}

function cleanSignal(value: string): string {
  return value.replace(/[.]+$/g, '').trim();
}

export function buildAlternativeChooseLine(input: BuildAlternativeChooseLineInput): string {
  if (input.curatedVerdict) {
    return `Choose ${input.altName} instead if: ${input.curatedVerdict}`;
  }

  if (input.computedDiff?.priceDiff) {
    return `Choose ${input.altName} instead if: pricing model differences are decisive for your team (${cleanSignal(input.computedDiff.priceDiff)}).`;
  }

  if (input.computedDiff?.learningDiff) {
    return `Choose ${input.altName} instead if: rollout speed matters most (${cleanSignal(input.computedDiff.learningDiff)}).`;
  }

  if (input.computedDiff?.featureDiff) {
    return `Choose ${input.altName} instead if: capability fit is the main driver (${cleanSignal(input.computedDiff.featureDiff)}).`;
  }

  return `Choose ${input.altName} instead if: its workflow and rollout profile fit your team better than ${input.mainName}.`;
}

export function buildAlternativeRationaleSourceLabel(curatedVerdict?: string | null): string {
  return curatedVerdict ? 'Comparison brief' : 'Pending verification';
}

export function buildAlternativeComparisonAxisLabel(input: {
  curatedVerdict?: string | null;
  computedDiff?: AlternativeRationaleDiff | null;
}): 'Comparison brief' | 'Pricing model' | 'Rollout speed' | 'Capability fit' | 'Workflow fit' {
  if (input.curatedVerdict) return 'Comparison brief';
  if (input.computedDiff?.priceDiff) return 'Pricing model';
  if (input.computedDiff?.learningDiff) return 'Rollout speed';
  if (input.computedDiff?.featureDiff) return 'Capability fit';
  return 'Workflow fit';
}
