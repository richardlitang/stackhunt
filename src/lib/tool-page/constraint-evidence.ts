export interface ToolPageConstraintEvidenceBullet {
  text: string;
  sourceUrl: string;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'>;
}

interface BuildToolPageConstraintEvidenceInput {
  constraints: unknown;
  isEligibleEvidenceUrl: (url: string) => boolean;
  isDisallowedConClaim: (text: string) => boolean;
}

export interface ToolPageConstraintEvidence {
  hiddenCostBullets: ToolPageConstraintEvidenceBullet[];
  hardLimitFromConstraints: ToolPageConstraintEvidenceBullet[];
}

export function buildToolPageConstraintEvidence(
  input: BuildToolPageConstraintEvidenceInput
): ToolPageConstraintEvidence {
  const constraints = (input.constraints || {}) as Record<string, unknown>;

  const hiddenCostBullets = Array.isArray(constraints.hidden_costs)
    ? constraints.hidden_costs
        .map((cost) => {
          const entry = cost as Record<string, unknown>;
          const sourceUrl = typeof entry.source_url === 'string' ? entry.source_url.trim() : '';
          if (!input.isEligibleEvidenceUrl(sourceUrl)) return null;
          const name = typeof entry.name === 'string' ? entry.name.trim() : 'Hidden cost';
          const amount = typeof entry.amount === 'string' ? ` (${entry.amount})` : '';
          const whenCharged =
            typeof entry.when_charged === 'string' ? ` — ${entry.when_charged}` : '';
          const worksForLenses = Array.isArray(entry.works_for_lenses)
            ? entry.works_for_lenses.filter(
                (lens): lens is 'personal' | 'startup' | 'enterprise' =>
                  lens === 'personal' || lens === 'startup' || lens === 'enterprise'
              )
            : undefined;
          return {
            text: `${name}${amount}${whenCharged}`,
            sourceUrl,
            ...(worksForLenses && worksForLenses.length > 0
              ? { works_for_lenses: worksForLenses }
              : {}),
          };
        })
        .filter((item): item is ToolPageConstraintEvidenceBullet => Boolean(item))
    : [];

  const hardLimitFromConstraints = Array.isArray(constraints.hard_limits)
    ? constraints.hard_limits
        .map((limit) => {
          const entry = limit as Record<string, unknown>;
          const sourceUrl = typeof entry.source_url === 'string' ? entry.source_url : '';
          if (!input.isEligibleEvidenceUrl(sourceUrl)) return null;
          const metric =
            typeof entry.metric === 'string' ? entry.metric.replace(/_/g, ' ') : 'Limit';
          const value =
            typeof entry.value === 'number' || typeof entry.value === 'string'
              ? String(entry.value)
              : '';
          const unit = typeof entry.unit === 'string' ? ` ${entry.unit}` : '';
          const plan =
            typeof entry.plan_name_match === 'string' ? ` (${entry.plan_name_match})` : '';
          const text = `${metric}: ${value}${unit}${plan}`.trim();
          if (!text || text === 'Limit:') return null;
          if (input.isDisallowedConClaim(text)) return null;
          const worksForLenses = Array.isArray(entry.works_for_lenses)
            ? entry.works_for_lenses.filter(
                (lens): lens is 'personal' | 'startup' | 'enterprise' =>
                  lens === 'personal' || lens === 'startup' || lens === 'enterprise'
              )
            : undefined;
          return {
            text,
            sourceUrl,
            ...(worksForLenses && worksForLenses.length > 0
              ? { works_for_lenses: worksForLenses }
              : {}),
          };
        })
        .filter((item): item is ToolPageConstraintEvidenceBullet => Boolean(item))
    : [];

  return {
    hiddenCostBullets,
    hardLimitFromConstraints,
  };
}
