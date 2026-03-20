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

function fallbackImplementationSummary(
  level: ToolPageBuyerDecisionLayer['heroDecisionCard']['implementationFriction']['level']
): string {
  if (level === 'low') return 'Low rollout friction for most teams.';
  if (level === 'medium') return 'Moderate rollout friction, validate admin setup early.';
  if (level === 'high')
    return 'High rollout friction, validate controls and ownership before scaling.';
  return 'Implementation friction needs confirmation.';
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

  const fitRows = [
    layer.fitMatrix.solo,
    layer.fitMatrix.startup,
    layer.fitMatrix.midMarket,
    layer.fitMatrix.enterprise,
  ];
  const normalizedFitRows = fitRows.map((row) => {
    if (!row) return null;
    const reason = sanitizeText(row.reason);
    const caveat = sanitizeText(row.caveat);
    if (!reason && !caveat) return null;
    return {
      ...row,
      reason,
      caveat,
    };
  });
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
    .slice(0, 3);

  const alternativesRebuttals = layer.alternativesRebuttals
    .filter((entry) => (allowedSlugs.size ? allowedSlugs.has(entry.slug) : true))
    .map((entry) => ({
      ...entry,
      toolName: sanitizeText(entry.toolName) || entry.toolName,
      chooseInsteadIf: cleanToolPageDecisionText(entry.chooseInsteadIf),
    }))
    .filter((entry) => entry.chooseInsteadIf)
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
