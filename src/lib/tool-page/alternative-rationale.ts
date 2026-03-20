interface AlternativeRationaleDiff {
  priceDiff?: string;
  learningDiff?: string;
  featureDiff?: string;
}

export type AlternativeRebuttalAngle =
  | 'Cheaper at scale'
  | 'Faster setup'
  | 'Deeper automation'
  | 'Stronger governance'
  | 'Better developer control'
  | 'Better reporting'
  | 'Workflow fit';

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

  return `Choose ${input.altName} instead if: you need a meaningfully different pricing model, rollout speed, or capability mix than ${input.mainName}.`;
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

export function buildAlternativeRebuttalAngle(input: {
  curatedVerdict?: string | null;
  computedDiff?: AlternativeRationaleDiff | null;
}): AlternativeRebuttalAngle {
  if (input.curatedVerdict) {
    const text = input.curatedVerdict.toLowerCase();
    if (/\b(price|pricing|cost|cheaper|budget|seat)\b/.test(text)) return 'Cheaper at scale';
    if (/\b(setup|rollout|onboard|fast|faster|quick)\b/.test(text)) return 'Faster setup';
    if (/\b(automation|workflow|orchestrat)\b/.test(text)) return 'Deeper automation';
    if (/\b(governance|audit|compliance|controls|policy)\b/.test(text))
      return 'Stronger governance';
    if (/\b(api|sdk|developer|code|extensib)\b/.test(text)) return 'Better developer control';
    if (/\b(report|analytics|insight|dashboard)\b/.test(text)) return 'Better reporting';
  }
  if (input.computedDiff?.priceDiff) return 'Cheaper at scale';
  if (input.computedDiff?.learningDiff) return 'Faster setup';
  if (input.computedDiff?.featureDiff) return 'Deeper automation';
  return 'Workflow fit';
}
