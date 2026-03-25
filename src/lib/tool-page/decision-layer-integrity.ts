import type { ToolPageBuyerDecisionLayer } from '@/types/tool-page-blueprint';
import { cleanToolPageDecisionText, cleanToolPageNarrativeText } from '@/lib/tool-page/text';

interface EnforceToolPageDecisionLayerIntegrityInput {
  layer: ToolPageBuyerDecisionLayer;
  allowedAlternativeSlugs?: string[];
}

function toNormalizedKey(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sanitizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = cleanToolPageNarrativeText(value);
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (lower.includes('[object object]')) return null;
  if (/^that need\b/.test(lower)) return null;
  return cleaned;
}

const GENERIC_TEST_PATTERNS = [
  /\bmatters most when this directly improves a workflow you run every day\b/i,
  /\bworkflow completes without role, plan, or handoff blockers\b/i,
  /\ba key step depends on a gated feature, hidden limit, or missing ownership\b/i,
  /\bdaily workflow test\b/i,
  /\badmin\/setup test\b/i,
  /\bfailure and export test\b/i,
];

function isGenericTestText(value: string | null | undefined): boolean {
  if (!value) return false;
  return GENERIC_TEST_PATTERNS.some((pattern) => pattern.test(value));
}

const GENERIC_ALTERNATIVE_PATTERNS = [
  /\bworkflow fit differs materially\b/i,
  /\bpricing model differences are decisive\b/i,
  /\bsetup speed is your top priority\b/i,
  /\bworkflow fit is stronger for your team\b/i,
];

function isGenericAlternativeReason(value: string | null | undefined): boolean {
  if (!value) return false;
  return GENERIC_ALTERNATIVE_PATTERNS.some((pattern) => pattern.test(value));
}

function fallbackImplementationSummary(
  level: ToolPageBuyerDecisionLayer['heroDecisionCard']['implementationFriction']['level']
): string {
  if (level === 'low') return 'Low rollout friction for most teams.';
  if (level === 'medium') return 'Moderate rollout friction, validate admin setup early.';
  if (level === 'high')
    return 'High rollout friction, validate controls and ownership before scaling.';
  return 'Implementation friction needs confirmation.';
}

type FitMatrixSegment = 'solo' | 'startup' | 'midMarket' | 'enterprise';

const FIT_SEGMENT_DEFAULT_REASON: Record<FitMatrixSegment, string> = {
  solo: 'Best fit depends on whether one operator can run the core workflow end to end.',
  startup: 'Fit is strongest when ownership and handoffs are clear before rollout.',
  midMarket: 'Fit depends on governance needs, approval flow, and reporting depth.',
  enterprise: 'Enterprise fit depends on controls, auditability, and rollout ownership.',
};

const FIT_SEGMENT_DEFAULT_CAVEAT: Record<FitMatrixSegment, string> = {
  solo: 'Validate free-tier limits and admin overhead before standardizing.',
  startup: 'Validate seat growth, automation limits, and upgrade thresholds early.',
  midMarket: 'Validate governance and reporting requirements before expansion.',
  enterprise: 'Validate compliance controls, procurement requirements, and migration risk.',
};

const ENTERPRISE_ONLY_CAVEAT_PATTERN =
  /\b(enterprise|procurement|fedramp|hipaa|soc ?2|iso ?27001|audit(?:ability)?|saml|scim|compliance|legal review)\b/i;

function normalizeFitMatrixRow(
  row: ToolPageBuyerDecisionLayer['fitMatrix']['solo'],
  segment: FitMatrixSegment
): ToolPageBuyerDecisionLayer['fitMatrix']['solo'] {
  if (!row) return null;
  const reasonRaw = sanitizeText(row.reason);
  const caveatRaw = sanitizeText(row.caveat);
  if (!reasonRaw && !caveatRaw) return null;

  const shouldReplaceWithSegmentFallback =
    segment !== 'enterprise' &&
    Boolean(caveatRaw) &&
    ENTERPRISE_ONLY_CAVEAT_PATTERN.test(caveatRaw || '');

  const reason =
    shouldReplaceWithSegmentFallback && reasonRaw && ENTERPRISE_ONLY_CAVEAT_PATTERN.test(reasonRaw)
      ? FIT_SEGMENT_DEFAULT_REASON[segment]
      : reasonRaw;
  const caveat = shouldReplaceWithSegmentFallback ? FIT_SEGMENT_DEFAULT_CAVEAT[segment] : caveatRaw;

  return {
    ...row,
    reason,
    caveat,
  };
}

export function enforceToolPageDecisionLayerIntegrity(
  input: EnforceToolPageDecisionLayerIntegrityInput
): ToolPageBuyerDecisionLayer {
  const layer = input.layer;
  const allowedSlugs = new Set((input.allowedAlternativeSlugs || []).filter(Boolean));

  const heroDecisionCard: ToolPageBuyerDecisionLayer['heroDecisionCard'] = {
    ...layer.heroDecisionCard,
    bestFor: cleanToolPageDecisionText(layer.heroDecisionCard.bestFor),
    notFor: cleanToolPageDecisionText(layer.heroDecisionCard.notFor),
    mainRisk: cleanToolPageDecisionText(layer.heroDecisionCard.mainRisk),
    upgradeTrigger: cleanToolPageDecisionText(layer.heroDecisionCard.upgradeTrigger),
    implementationFriction: {
      ...layer.heroDecisionCard.implementationFriction,
      summary:
        sanitizeText(layer.heroDecisionCard.implementationFriction.summary) ||
        fallbackImplementationSummary(layer.heroDecisionCard.implementationFriction.level),
      drivers: layer.heroDecisionCard.implementationFriction.drivers
        .map((item) => sanitizeText(item))
        .filter((item): item is string => Boolean(item))
        .slice(0, 4),
      stakeholders: layer.heroDecisionCard.implementationFriction.stakeholders
        .map((item) => sanitizeText(item))
        .filter((item): item is string => Boolean(item))
        .slice(0, 4),
    },
  };

  const fitRows: Array<{
    segment: FitMatrixSegment;
    row: ToolPageBuyerDecisionLayer['fitMatrix']['solo'];
  }> = [
    { segment: 'solo', row: layer.fitMatrix.solo },
    { segment: 'startup', row: layer.fitMatrix.startup },
    { segment: 'midMarket', row: layer.fitMatrix.midMarket },
    { segment: 'enterprise', row: layer.fitMatrix.enterprise },
  ];
  const normalizedFitRows = fitRows.map(({ segment, row }) => normalizeFitMatrixRow(row, segment));
  const fitContentKeys = normalizedFitRows
    .map((row) => (row ? toNormalizedKey(`${row.reason || ''}|${row.caveat || ''}`) : ''))
    .filter((key) => key.length > 0);
  const fitMatrixSuppressed = fitContentKeys.length > 1 && new Set(fitContentKeys).size <= 1;
  const fitMatrix: ToolPageBuyerDecisionLayer['fitMatrix'] = fitMatrixSuppressed
    ? { solo: null, startup: null, midMarket: null, enterprise: null }
    : {
        solo: normalizedFitRows[0],
        startup: normalizedFitRows[1],
        midMarket: normalizedFitRows[2],
        enterprise: normalizedFitRows[3],
      };

  const freeWorksIf = sanitizeText(layer.pricingReality.freeWorksIf);
  const paidNeededWhenRaw = sanitizeText(layer.pricingReality.paidNeededWhen);
  const paidNeededWhen =
    toNormalizedKey(freeWorksIf) &&
    toNormalizedKey(freeWorksIf) === toNormalizedKey(paidNeededWhenRaw)
      ? null
      : paidNeededWhenRaw;
  const pricingReality: ToolPageBuyerDecisionLayer['pricingReality'] = {
    ...layer.pricingReality,
    freeWorksIf,
    paidNeededWhen,
    hiddenCostTriggers: layer.pricingReality.hiddenCostTriggers
      .map((item) => sanitizeText(item))
      .filter((item): item is string => Boolean(item))
      .filter(
        (item, index, list) =>
          list.findIndex((entry) => toNormalizedKey(entry) === toNormalizedKey(item)) === index
      )
      .slice(0, 4),
    mainCostDrivers: layer.pricingReality.mainCostDrivers
      .map((item) => sanitizeText(item))
      .filter((item): item is string => Boolean(item))
      .filter(
        (item, index, list) =>
          list.findIndex((entry) => toNormalizedKey(entry) === toNormalizedKey(item)) === index
      )
      .slice(0, 4),
  };

  const seenTests = new Set<string>();
  const beforeYouBuyTests = layer.beforeYouBuyTests
    .map((test) => ({
      ...test,
      name: sanitizeText(test.name),
      whyItMatters: sanitizeText(test.whyItMatters),
      whatToDo: sanitizeText(test.whatToDo),
      passCondition: sanitizeText(test.passCondition),
      commonFailure: sanitizeText(test.commonFailure),
    }))
    .filter(
      (
        test
      ): test is typeof test & {
        name: string;
      } => typeof test.name === 'string' && test.name.length > 0
    )
    .filter((test) => {
      const key = toNormalizedKey(
        `${test.testType}|${test.name || ''}|${test.whyItMatters || ''}|${test.whatToDo || ''}`
      );
      if (!key || seenTests.has(key)) return false;
      seenTests.add(key);
      return true;
    })
    .filter((test) => {
      const genericSignals = [
        isGenericTestText(test.name),
        isGenericTestText(test.whyItMatters),
        isGenericTestText(test.whatToDo),
        isGenericTestText(test.passCondition),
        isGenericTestText(test.commonFailure),
      ].filter(Boolean).length;
      return genericSignals < 3;
    })
    .slice(0, 3);

  const alternativesRebuttals = layer.alternativesRebuttals
    .filter((entry) => (allowedSlugs.size ? allowedSlugs.has(entry.slug) : true))
    .map((entry) => ({
      ...entry,
      toolName: sanitizeText(entry.toolName) || entry.toolName,
      chooseInsteadIf: cleanToolPageDecisionText(entry.chooseInsteadIf),
    }))
    .filter((entry) => entry.chooseInsteadIf && !isGenericAlternativeReason(entry.chooseInsteadIf))
    .filter(
      (entry, index, list) => list.findIndex((candidate) => candidate.slug === entry.slug) === index
    );

  return {
    ...layer,
    heroDecisionCard,
    fitMatrix,
    pricingReality,
    beforeYouBuyTests,
    alternativesRebuttals,
  };
}
