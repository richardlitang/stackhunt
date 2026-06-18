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

function sanitizeChooseInsteadIf(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  if (cleaned.toLowerCase().includes('[object object]')) return null;
  if (/^that need\b/i.test(cleaned)) return null;
  return cleaned;
}

export function buildAlternativeChooseLine(input: BuildAlternativeChooseLineInput): string {
  if (input.curatedVerdict) {
    const sanitized = sanitizeChooseInsteadIf(input.curatedVerdict);
    if (sanitized) return `Choose ${input.altName} instead if ${sanitized}`;
  }

  if (input.computedDiff?.priceDiff) {
    return `Choose ${input.altName} instead if price model differences are decisive (${cleanSignal(input.computedDiff.priceDiff)}).`;
  }

  if (input.computedDiff?.learningDiff) {
    return `Choose ${input.altName} instead if setup speed is your top priority (${cleanSignal(input.computedDiff.learningDiff)}).`;
  }

  if (input.computedDiff?.featureDiff) {
    return `Choose ${input.altName} instead if this capability gap matters most (${cleanSignal(input.computedDiff.featureDiff)}).`;
  }

  return `Choose ${input.altName} instead if workflow fit is stronger for your team than ${input.mainName}.`;
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
