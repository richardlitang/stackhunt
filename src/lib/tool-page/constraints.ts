export interface ToolPageConstraintBullet {
  text: string;
  sourceUrl: string;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'>;
}

export interface DeriveCanonicalHardLimitsInput {
  hardLimitFromConstraints: ToolPageConstraintBullet[];
  effectiveEvidenceCons: ToolPageConstraintBullet[];
  hiddenCostBullets: ToolPageConstraintBullet[];
}

export interface ToolPageCanonicalHardLimits {
  hardLimitBullets: ToolPageConstraintBullet[];
  canonicalHardLimits: ToolPageConstraintBullet[];
  topHardLimit: ToolPageConstraintBullet | null;
}

function withUniqueText(items: ToolPageConstraintBullet[]): ToolPageConstraintBullet[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function deriveToolPageCanonicalHardLimits(
  input: DeriveCanonicalHardLimitsInput
): ToolPageCanonicalHardLimits {
  const hardLimitBullets = withUniqueText(
    [
      ...input.hardLimitFromConstraints,
      ...input.effectiveEvidenceCons.filter((item) =>
        /\b(limit|limited|quota|cap|hard stop|ceiling|overage|maximum|max)\b/i.test(item.text)
      ),
      ...input.hiddenCostBullets.filter((item) => /\b(setup fee|one-time|activation)\b/i.test(item.text)),
    ].slice(0, 6)
  );
  const canonicalHardLimits = withUniqueText([...hardLimitBullets, ...input.hiddenCostBullets]).slice(0, 6);

  return {
    hardLimitBullets,
    canonicalHardLimits,
    topHardLimit: canonicalHardLimits[0] || null,
  };
}
