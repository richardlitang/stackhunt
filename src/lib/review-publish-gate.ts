import { evaluateIndexReadiness } from '@/lib/quality-gate';
import { normalizeTextContent as normalizeText } from '@/lib/utils/content-sanitizer';
import {
  classifyClaimVolatility,
  detectRiskyCopyTerms,
  hasScopeQualifier,
  isClaimStale,
} from '@/lib/claim-policy';
import { evaluateToolPageQaGate } from '@/lib/tool-page/qa-gate';
import { deriveToolPageDecisionLayerConsistencySignals } from '@/lib/tool-page/decision-layer-consistency-signals';
import { deriveToolPageLaneDecisionEvidenceSignals } from '@/lib/tool-page/lane-decision-signals';
import { readToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';
import type { Review, Tool } from '@/types/database';

const AUTHORITATIVE_SOURCE_TYPES = new Set(['official', 'docs', 'support', 'legal']);
const RISKY_ABSOLUTE_TERMS =
  /\b(always|never|broken|scam|unreliable|guaranteed|everyone|nobody)\b/i;
const NEGATIVE_CLAIM_TERMS =
  /\b(no|not|lacks|lack|cannot|can't|does not|doesn't|won't|avoid|risk|limit|limited|missing|unavailable)\b/i;
const PRICING_CLAIM_TERMS =
  /\b(price|pricing|cost|costs|fee|fees|billing|billed|monthly|annual|yearly|enterprise|pro\b|max\b|plan|seat)\b/i;
const PRICING_NUMERIC_TERMS = /\$|\/\s*(mo|month|yr|year)|\b\d+(?:\.\d+)?\s*(?:usd|dollars?)\b/i;
const COMPARATOR_TERMS =
  /\b(vs\.?|versus|compared to|more than|less than|faster than|slower than|better than|worse than|double|doubles|doubling|half|halve)\b/i;
const OFFICIAL_PRICING_PATH = /\/(pricing|plans?|subscription)/i;
const OFFICIAL_DOC_PATH =
  /\/(docs?|help|support|developers?|api|changelog|release|updates|status)/i;
const CLAIM_SOURCE_FALLBACK_PATH =
  /\/(pricing|plans?|docs?|help|support|developers?|api|security|trust|legal)/i;
const GENERIC_COPY_PATTERNS = [
  /\bsolid choice\b/i,
  /\bgreat (?:tool|choice|option)\b/i,
  /\bgood for teams\b/i,
  /\bclear tool guidance\b/i,
  /\bpowerful platform\b/i,
  /\bintuitive interface\b/i,
  /\brobust solution\b/i,
  /\bhelps you\b/i,
];
const SCENARIO_DECISION_PATTERNS = [
  /\bif [^.!?]{5,120}\b(?:choose|use|pick)\b/i,
  /\bif [^.!?]{5,120}\b(?:avoid|skip|switch)\b/i,
  /\bbest for\b[^.!?]{8,160}/i,
  /\bnot for\b[^.!?]{8,160}/i,
  /\bavoid if\b[^.!?]{8,160}/i,
  /\bswitch (?:when|if)\b[^.!?]{8,160}/i,
];
const MIN_COPY_QUALITY_SCORE = 60;

type SourceRow = {
  url?: string;
  domain?: string;
  source_type?: string;
  type?: string;
};

type ParsedClaim = {
  text: string;
  sourceUrl: string | null;
  checkedAt: string | null;
  volatility: 'high' | 'medium' | 'low' | null;
  scope: string | null;
};

type PublishableItemFields = Pick<
  Tool,
  | 'id'
  | 'metadata'
  | 'specs'
  | 'pricing_verified_at'
  | 'short_description'
  | 'verdict'
  | 'updated_at'
> & {
  pricing_confidence?: string | number | null;
};

type PublishableReviewFields = Pick<Review, 'summary_markdown' | 'cons' | 'sources'>;

export interface StrictPublishGateResult {
  pass: boolean;
  blockers: string[];
  evidenceGrade: 'A' | 'B' | 'C';
  metrics: {
    requiredSourcingMissingCount: number;
    riskFlagsCount: number;
    pricingConfidence: 'high' | 'medium' | 'low' | 'unknown';
    pricingClaimsMissingGuards: number;
    staleHighVolatilityClaims: number;
    riskyCopyTermCount: number;
    genericPhraseCount: number;
    scenarioRecommendationCount: number;
    copyQualityScore: number;
  };
}

function normalizeDomain(input?: string): string | null {
  if (!input) return null;
  const trimmed = input
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  return trimmed || null;
}

function extractDomainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function toSources(raw: unknown): SourceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is SourceRow => Boolean(entry && typeof entry === 'object'));
}

function parseClaim(raw: unknown): ParsedClaim | null {
  if (typeof raw === 'string') {
    const text = normalizeText(raw);
    if (!text) return null;
    return { text, sourceUrl: null, checkedAt: null, volatility: null, scope: null };
  }
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const text = typeof value.text === 'string' ? normalizeText(value.text) : '';
  const sourceUrl =
    (typeof value.source_url === 'string' && value.source_url.trim()) ||
    (Array.isArray(value.source_urls) &&
    typeof value.source_urls[0] === 'string' &&
    value.source_urls[0].trim()
      ? value.source_urls[0].trim()
      : '');
  const checkedAtRaw =
    (typeof value.checked_at === 'string' && value.checked_at.trim()) ||
    (typeof value.retrieved_at === 'string' && value.retrieved_at.trim()) ||
    null;
  const volatilityRaw =
    typeof value.volatility === 'string' ? value.volatility.trim().toLowerCase() : null;
  const volatility =
    volatilityRaw === 'high' || volatilityRaw === 'medium' || volatilityRaw === 'low'
      ? (volatilityRaw as 'high' | 'medium' | 'low')
      : null;
  const scope = typeof value.scope === 'string' && value.scope.trim() ? value.scope.trim() : null;
  if (!text) return null;
  return {
    text,
    sourceUrl: sourceUrl || null,
    checkedAt: checkedAtRaw,
    volatility,
    scope,
  };
}

function toClaimArray(raw: unknown): ParsedClaim[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseClaim).filter((entry): entry is ParsedClaim => Boolean(entry));
}

function toPricingConfidence(
  raw: string | number | null | undefined
): 'high' | 'medium' | 'low' | 'unknown' {
  if (typeof raw === 'string') {
    const normalized = raw.toLowerCase();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
    return 'unknown';
  }
  if (typeof raw === 'number') {
    if (raw >= 0.75) return 'high';
    if (raw >= 0.5) return 'medium';
    return 'low';
  }
  return 'unknown';
}

function getMetadata(item: PublishableItemFields): Record<string, unknown> {
  return (item.metadata as Record<string, unknown> | null) || {};
}

function getSpecs(item: PublishableItemFields): Record<string, unknown> {
  return (item.specs as Record<string, unknown> | null) || {};
}

function collectFallbackEvidenceUrls(item: PublishableItemFields): string[] {
  const metadata = getMetadata(item);
  const specs = getSpecs(item);
  const urls: string[] = [];
  const addUrl = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      urls.push(parsed.toString());
    } catch {
      // Ignore invalid URLs in metadata/specs.
    }
  };

  addUrl(metadata.website_url);
  addUrl((metadata.smp_pricing as Record<string, unknown> | undefined)?.pricing_page_url);
  addUrl((metadata.setup_complexity as Record<string, unknown> | undefined)?.setup_url);

  const constraints = (specs.constraints as Record<string, unknown> | undefined) || {};
  const hardLimits = Array.isArray(constraints.hard_limits) ? constraints.hard_limits : [];
  const hiddenCosts = Array.isArray(constraints.hidden_costs) ? constraints.hidden_costs : [];
  for (const entry of [...hardLimits, ...hiddenCosts]) {
    if (!entry || typeof entry !== 'object') continue;
    addUrl((entry as Record<string, unknown>).source_url);
  }

  const faqs = Array.isArray(metadata.faqs) ? metadata.faqs : [];
  for (const faq of faqs) {
    if (!faq || typeof faq !== 'object') continue;
    const faqRecord = faq as Record<string, unknown>;
    const sourceType =
      typeof faqRecord.answer_source_type === 'string'
        ? faqRecord.answer_source_type.toLowerCase()
        : '';
    if (sourceType !== 'official') continue;
    addUrl(faqRecord.answer_source_url);
  }

  return Array.from(new Set(urls));
}

export function evaluateStrictPublishGate(
  item: PublishableItemFields,
  review: PublishableReviewFields
): StrictPublishGateResult {
  const blockers: string[] = [];
  const readiness = evaluateIndexReadiness(item as Tool, review as Review);
  blockers.push(...readiness.reasons.map((reason) => `quality_gate:${reason}`));

  const sources = toSources(review.sources);
  const fallbackEvidenceUrls = collectFallbackEvidenceUrls(item);
  const authoritativeDomains = new Set<string>();
  let authoritativeSources = 0;
  let hasOfficialPricingSource = false;
  let hasOfficialDocOrHelpSource = false;

  for (const source of sources) {
    const domain = normalizeDomain(source.domain) || extractDomainFromUrl(source.url);
    const sourceType = (source.source_type || source.type || '').toLowerCase();
    const lowerUrl = (source.url || '').toLowerCase();
    if (AUTHORITATIVE_SOURCE_TYPES.has(sourceType) && domain) {
      authoritativeSources += 1;
      authoritativeDomains.add(domain);
    } else if (AUTHORITATIVE_SOURCE_TYPES.has(sourceType)) {
      authoritativeSources += 1;
    }
    if (AUTHORITATIVE_SOURCE_TYPES.has(sourceType) || CLAIM_SOURCE_FALLBACK_PATH.test(lowerUrl)) {
      if (OFFICIAL_PRICING_PATH.test(lowerUrl)) hasOfficialPricingSource = true;
      if (OFFICIAL_DOC_PATH.test(lowerUrl)) hasOfficialDocOrHelpSource = true;
    }
  }

  for (const url of fallbackEvidenceUrls) {
    const lowerUrl = url.toLowerCase();
    const domain = extractDomainFromUrl(url);
    if (domain) authoritativeDomains.add(domain);
    if (OFFICIAL_PRICING_PATH.test(lowerUrl)) hasOfficialPricingSource = true;
    if (OFFICIAL_DOC_PATH.test(lowerUrl)) hasOfficialDocOrHelpSource = true;
  }

  const evidenceGrade: 'A' | 'B' | 'C' =
    (authoritativeDomains.size >= 2 &&
      hasOfficialPricingSource &&
      hasOfficialDocOrHelpSource &&
      sources.length >= 3) ||
    (authoritativeDomains.size >= 1 &&
      hasOfficialPricingSource &&
      hasOfficialDocOrHelpSource &&
      sources.length >= 5) ||
    (authoritativeDomains.size >= 2 && authoritativeSources >= 5 && sources.length >= 8)
      ? 'A'
      : authoritativeDomains.size >= 1 && (hasOfficialPricingSource || hasOfficialDocOrHelpSource)
        ? 'B'
        : 'C';
  if (evidenceGrade !== 'A') blockers.push(`strict:evidence_grade_${evidenceGrade.toLowerCase()}`);

  const consClaims = toClaimArray(review.cons);
  const requiredSourcingMissingCount = consClaims.filter((claim) => {
    const required = NEGATIVE_CLAIM_TERMS.test(claim.text) || PRICING_CLAIM_TERMS.test(claim.text);
    if (!required) return false;
    return !claim.sourceUrl;
  }).length;
  if (requiredSourcingMissingCount > 0) {
    blockers.push(`strict:required_sourcing_missing:${requiredSourcingMissingCount}`);
  }

  const summaryText = normalizeText(review.summary_markdown || '');
  const verdictText = normalizeText(item.verdict || '');
  const shortDescriptionText = normalizeText(item.short_description || '');
  const laneOutputs = readToolPageLaneOutputs(item as Tool);
  const laneDecisionSignals = deriveToolPageLaneDecisionEvidenceSignals(laneOutputs);
  const laneConsistencySignals = deriveToolPageDecisionLayerConsistencySignals({
    decisionSnapshotBestWhen: [],
    decisionSnapshotWatchOuts: [],
    decisionTradeoffSummary: summaryText || null,
    laneOutputs,
  });
  let riskFlagsCount = 0;
  if (RISKY_ABSOLUTE_TERMS.test(summaryText)) riskFlagsCount += 1;
  if (COMPARATOR_TERMS.test(summaryText) && sources.length < 2) riskFlagsCount += 1;
  for (const claim of consClaims) {
    if (RISKY_ABSOLUTE_TERMS.test(claim.text)) riskFlagsCount += 1;
    if (COMPARATOR_TERMS.test(claim.text) && !claim.sourceUrl) riskFlagsCount += 1;
  }
  if (riskFlagsCount > 0) blockers.push(`strict:risk_flags:${riskFlagsCount}`);

  const pricingConfidence = toPricingConfidence(item.pricing_confidence);
  const hasNumericPricingClaims =
    PRICING_NUMERIC_TERMS.test(summaryText) ||
    consClaims.some((claim) => PRICING_NUMERIC_TERMS.test(claim.text));
  const pricingClaimsMissingGuards = consClaims.filter((claim) => {
    if (!PRICING_NUMERIC_TERMS.test(claim.text)) return false;
    const hasScopedContext = Boolean(claim.scope) || hasScopeQualifier(claim.text);
    return !claim.sourceUrl || !claim.checkedAt || !hasScopedContext;
  }).length;
  const staleHighVolatilityClaims = consClaims.filter((claim) => {
    const volatility = claim.volatility || classifyClaimVolatility(claim.text, 'fact');
    if (volatility !== 'high') return false;
    return isClaimStale(claim.checkedAt, volatility);
  }).length;
  const riskyCopyTerms = Array.from(
    new Set(
      [summaryText, ...consClaims.map((claim) => claim.text)]
        .flatMap((text) => detectRiskyCopyTerms(text))
        .filter(Boolean)
    )
  );
  const hasClaimLevelPricingProof = consClaims.some((claim) => {
    if (!claim.sourceUrl) return false;
    const lowerSourceUrl = claim.sourceUrl.toLowerCase();
    if (OFFICIAL_PRICING_PATH.test(lowerSourceUrl)) return true;
    return PRICING_NUMERIC_TERMS.test(claim.text) && Boolean(claim.checkedAt);
  });
  const narrativeCorpus = [summaryText, verdictText, shortDescriptionText]
    .filter(Boolean)
    .join(' ');
  const genericPhraseCount = GENERIC_COPY_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(narrativeCorpus) ? 1 : 0),
    0
  );
  const scenarioRecommendationCount = SCENARIO_DECISION_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(narrativeCorpus) ? 1 : 0),
    0
  );
  const copyQualityScore = Math.max(
    0,
    100 -
      genericPhraseCount * 20 -
      (scenarioRecommendationCount > 0 ? 0 : 35) -
      (narrativeCorpus.length < 180 ? 15 : 0)
  );
  if (!['high', 'medium'].includes(pricingConfidence) && hasNumericPricingClaims) {
    blockers.push('strict:pricing_confidence_low_or_unknown_with_numeric_claims');
  }
  if (pricingClaimsMissingGuards > 0) {
    blockers.push(`strict:pricing_claims_missing_required_fields:${pricingClaimsMissingGuards}`);
  }
  if (staleHighVolatilityClaims > 0) {
    blockers.push(`strict:high_volatility_claims_stale:${staleHighVolatilityClaims}`);
  }
  if (riskyCopyTerms.length > 0) {
    blockers.push(`strict:risky_copy_terms:${riskyCopyTerms.join('|')}`);
  }
  if (genericPhraseCount > 0) {
    blockers.push(`strict:copy_contains_generic_filler:${genericPhraseCount}`);
  }
  if (scenarioRecommendationCount === 0) {
    blockers.push('strict:copy_missing_scenario_recommendation');
  }
  if (copyQualityScore < MIN_COPY_QUALITY_SCORE) {
    blockers.push(
      `strict:copy_quality_score_below_min:${copyQualityScore}<${MIN_COPY_QUALITY_SCORE}`
    );
  }

  const hasPricingProofForGate = Boolean(
    item.pricing_verified_at || hasOfficialPricingSource || hasClaimLevelPricingProof
  );
  const qaGate = evaluateToolPageQaGate({
    title: 'Tool Review | StackHunt',
    h1: 'Tool Review',
    intro: summaryText || shortDescriptionText,
    verdict: verdictText || summaryText,
    evaluationDepth: 'docs_only',
    pricingSectionVisible: hasNumericPricingClaims,
    hasPricingCheckedProof: hasPricingProofForGate,
    schemaMatchesVisibleContent: true,
    requiresSourceBackedDecisionLayer: Boolean(laneOutputs),
    hasSourceBackedMainRiskSignal: laneDecisionSignals.hasSourceBackedMainRiskSignal,
    hasSourceBackedUpgradeTriggerSignal: laneDecisionSignals.hasSourceBackedUpgradeTriggerSignal,
    hasSourceBackedImplementationFrictionSignal:
      laneDecisionSignals.hasSourceBackedImplementationFrictionSignal,
    hasSourceBackedFitMatrixSignal: laneDecisionSignals.hasSourceBackedFitMatrixSignal,
    hasSourceBackedTestBeforeBuySignal: laneDecisionSignals.hasSourceBackedTestBeforeBuySignal,
    hasMalformedDecisionLayerSignal: laneConsistencySignals.hasMalformedDecisionLayerSignal,
    hasDuplicatePricingRealitySignal: laneConsistencySignals.hasDuplicatePricingRealitySignal,
    hasDuplicateFitMatrixRowsSignal: laneConsistencySignals.hasDuplicateFitMatrixRowsSignal,
    hasEnterpriseFitContradictionSignal: laneConsistencySignals.hasEnterpriseFitContradictionSignal,
  });
  if (!qaGate.pass) {
    for (const blocker of qaGate.blockers) {
      blockers.push(`strict:qa_gate:${blocker}`);
    }
  }

  return {
    pass: blockers.length === 0,
    blockers: Array.from(new Set(blockers)),
    evidenceGrade,
    metrics: {
      requiredSourcingMissingCount,
      riskFlagsCount,
      pricingConfidence,
      pricingClaimsMissingGuards,
      staleHighVolatilityClaims,
      riskyCopyTermCount: riskyCopyTerms.length,
      genericPhraseCount,
      scenarioRecommendationCount,
      copyQualityScore,
    },
  };
}
