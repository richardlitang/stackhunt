import type {
  ClaimWithSource,
  ClaimType,
  HunterAnalysis,
  HunterEntityScope,
  HunterLaneClaim,
  HunterLaneOutputs,
  SourceType,
} from '@/lib/hunter/types';

const PRICING_TOKENS =
  /\b(price|pricing|cost|costs|billing|billed|plan|plans|tier|tiers|seat|quota|credit|credits|overage)\b/i;
const LIMIT_TOKENS =
  /\b(limit|limits|cap|caps|ceiling|ceilings|maximum|max|minimum|min|rate limit|throttle)\b/i;
const VALID_SOURCE_TYPES = new Set<SourceType>(['official', 'editorial', 'community']);
const FACTUAL_SOURCE_TYPES = new Set<SourceType>(['official', 'editorial']);

export interface HunterLaneNormalizationStats {
  moved_to_user_signal_pros: number;
  moved_to_user_signal_cons: number;
  moved_to_fact_pros: number;
  moved_to_fact_cons: number;
  claim_type_coerced_to_opinion: number;
}

function readClaimText(claim: string | ClaimWithSource): string {
  return typeof claim === 'string' ? claim : claim.text || '';
}

function toLaneClaim(claim: string | ClaimWithSource): HunterLaneClaim | null {
  if (typeof claim === 'string') {
    const text = claim.trim();
    return text.length > 0 ? { text } : null;
  }

  const text = String(claim.text || '').trim();
  if (text.length === 0) return null;
  return {
    text,
    source_url: claim.source_url || null,
    source_type: (claim.source_type as SourceType | undefined) || null,
    claim_type: (claim.claim_type as ClaimType | undefined) || null,
  };
}

function toClaimWithSource(claim: string | ClaimWithSource): ClaimWithSource | null {
  if (typeof claim !== 'object' || !claim) return null;
  const text = typeof claim.text === 'string' ? claim.text.trim() : '';
  if (!text) return null;

  const source_type = VALID_SOURCE_TYPES.has(claim.source_type as SourceType)
    ? (claim.source_type as SourceType)
    : null;
  const claim_type =
    claim.claim_type === 'fact' || claim.claim_type === 'opinion' ? claim.claim_type : null;
  if (!source_type || !claim_type) return null;

  return {
    ...claim,
    text,
    source_type,
    claim_type,
  };
}

function claimDedupeKey(claim: string | ClaimWithSource): string {
  if (typeof claim === 'string') return `legacy:${claim.trim().toLowerCase()}`;
  const text = String(claim.text || '')
    .trim()
    .toLowerCase();
  const source = String(claim.source_url || '')
    .trim()
    .toLowerCase();
  return `${text}|${source}`;
}

function dedupeClaims(claims: Array<string | ClaimWithSource>): Array<string | ClaimWithSource> {
  const seen = new Set<string>();
  const deduped: Array<string | ClaimWithSource> = [];
  for (const claim of claims) {
    const key = claimDedupeKey(claim);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(claim);
  }
  return deduped;
}

function isUserSignalClaim(claim: ClaimWithSource): boolean {
  if (claim.claim_type === 'opinion') return true;
  return claim.source_type === 'community';
}

function isFactualClaim(claim: ClaimWithSource): boolean {
  if (claim.claim_type !== 'fact') return false;
  return !!claim.source_type && FACTUAL_SOURCE_TYPES.has(claim.source_type);
}

/**
 * Normalize claim lanes before downstream decision rendering:
 * - pros/cons are factual claims
 * - userReported* arrays are user/editorial experience signals
 */
export function normalizeHunterAnalysisEvidenceLanes(
  analysis: HunterAnalysis
): HunterLaneNormalizationStats {
  const stats: HunterLaneNormalizationStats = {
    moved_to_user_signal_pros: 0,
    moved_to_user_signal_cons: 0,
    moved_to_fact_pros: 0,
    moved_to_fact_cons: 0,
    claim_type_coerced_to_opinion: 0,
  };

  const normalizedPros = Array.isArray(analysis.pros) ? [...analysis.pros] : [];
  const normalizedCons = Array.isArray(analysis.cons) ? [...analysis.cons] : [];
  const normalizedUserPros = Array.isArray(analysis.userReportedPros)
    ? [...analysis.userReportedPros]
    : [];
  const normalizedUserCons = Array.isArray(analysis.userReportedCons)
    ? [...analysis.userReportedCons]
    : [];

  const keepFactPros: Array<string | ClaimWithSource> = [];
  const keepFactCons: Array<string | ClaimWithSource> = [];
  const keepUserPros: Array<string | ClaimWithSource> = [];
  const keepUserCons: Array<string | ClaimWithSource> = [];

  for (const raw of normalizedPros) {
    const claim = toClaimWithSource(raw);
    if (!claim) {
      keepFactPros.push(raw);
      continue;
    }
    if (claim.source_type === 'community' && claim.claim_type === 'fact') {
      claim.claim_type = 'opinion';
      stats.claim_type_coerced_to_opinion += 1;
    }
    if (isUserSignalClaim(claim)) {
      keepUserPros.push(claim);
      stats.moved_to_user_signal_pros += 1;
      continue;
    }
    keepFactPros.push(claim);
  }

  for (const raw of normalizedCons) {
    const claim = toClaimWithSource(raw);
    if (!claim) {
      keepFactCons.push(raw);
      continue;
    }
    if (claim.source_type === 'community' && claim.claim_type === 'fact') {
      claim.claim_type = 'opinion';
      stats.claim_type_coerced_to_opinion += 1;
    }
    if (isUserSignalClaim(claim)) {
      keepUserCons.push(claim);
      stats.moved_to_user_signal_cons += 1;
      continue;
    }
    keepFactCons.push(claim);
  }

  for (const raw of normalizedUserPros) {
    const claim = toClaimWithSource(raw);
    if (!claim) {
      keepUserPros.push(raw);
      continue;
    }
    if (claim.source_type === 'community' && claim.claim_type === 'fact') {
      claim.claim_type = 'opinion';
      stats.claim_type_coerced_to_opinion += 1;
    }
    if (isFactualClaim(claim)) {
      keepFactPros.push(claim);
      stats.moved_to_fact_pros += 1;
      continue;
    }
    keepUserPros.push(claim);
  }

  for (const raw of normalizedUserCons) {
    const claim = toClaimWithSource(raw);
    if (!claim) {
      keepUserCons.push(raw);
      continue;
    }
    if (claim.source_type === 'community' && claim.claim_type === 'fact') {
      claim.claim_type = 'opinion';
      stats.claim_type_coerced_to_opinion += 1;
    }
    if (isFactualClaim(claim)) {
      keepFactCons.push(claim);
      stats.moved_to_fact_cons += 1;
      continue;
    }
    keepUserCons.push(claim);
  }

  analysis.pros = dedupeClaims(keepFactPros);
  analysis.cons = dedupeClaims(keepFactCons);
  analysis.userReportedPros = dedupeClaims(keepUserPros);
  analysis.userReportedCons = dedupeClaims(keepUserCons);

  return stats;
}

function inferSubjectType(
  entityScope?: HunterEntityScope
): HunterLaneOutputs['subject_profile']['subject_type'] {
  if (!entityScope || entityScope === 'core') return 'product';
  if (entityScope === 'enterprise_cloud' || entityScope === 'enterprise_server') {
    return 'deployment_mode';
  }
  return 'product_surface';
}

function inferSubjectConfidence(entityScope?: HunterEntityScope): 'high' | 'medium' | 'low' {
  if (!entityScope) return 'medium';
  return 'high';
}

function buildLaneFitRow(
  fit: 'weak' | 'mixed' | 'strong',
  reason: string | null,
  caveat: string | null
): { fit: 'weak' | 'mixed' | 'strong'; caveat: string | null; reason: string | null } {
  return {
    fit,
    caveat,
    reason,
  };
}

function toUpgradeTriggerFromFacts(input: {
  officialLimitFacts: HunterLaneClaim[];
  officialPricingFacts: HunterLaneClaim[];
  mainTradeoff: string | null;
}): string | null {
  const fromLimits = input.officialLimitFacts.find((claim) => claim.text.trim().length > 0)?.text;
  if (fromLimits) return fromLimits;
  const fromPricing = input.officialPricingFacts.find(
    (claim) => claim.text.trim().length > 0
  )?.text;
  if (fromPricing) return fromPricing;
  return input.mainTradeoff;
}

function toMainRiskFromFacts(input: {
  officialLimitFacts: HunterLaneClaim[];
  officialPricingFacts: HunterLaneClaim[];
  mainTradeoff: string | null;
}): string | null {
  const fromLimits = input.officialLimitFacts.find((claim) => claim.text.trim().length > 0)?.text;
  if (fromLimits) return fromLimits;
  const fromPricing = input.officialPricingFacts.find(
    (claim) => claim.text.trim().length > 0
  )?.text;
  if (fromPricing) return fromPricing;
  return input.mainTradeoff;
}

function inferImplementationFrictionLevel(input: {
  officialLimitFacts: HunterLaneClaim[];
  mainTradeoff: string | null;
}): 'low' | 'medium' | 'high' | null {
  const limitCount = input.officialLimitFacts.length;
  const tradeoffText = (input.mainTradeoff || '').toLowerCase();
  if (
    limitCount >= 3 ||
    /\b(migration|procurement|governance|approval|compliance|admin)\b/.test(tradeoffText)
  ) {
    return 'high';
  }
  if (limitCount >= 1 || /\b(setup|integration|handoff|permissions|roles)\b/.test(tradeoffText)) {
    return 'medium';
  }
  return null;
}

function inferImplementationFrictionStakeholders(input: {
  bestFor: string | null;
  notFor: string | null;
}): string[] {
  const text = `${input.bestFor || ''} ${input.notFor || ''}`.toLowerCase();
  const stakeholders: string[] = [];
  if (/\b(engineer|developer|devops|it)\b/.test(text)) stakeholders.push('engineering');
  if (/\b(finance|procurement|controller|audit)\b/.test(text)) stakeholders.push('finance');
  if (/\b(security|compliance|governance|risk)\b/.test(text)) stakeholders.push('security');
  if (/\b(manager|ops|operations|admin)\b/.test(text)) stakeholders.push('operations');
  if (stakeholders.length === 0) stakeholders.push('operations');
  return stakeholders.slice(0, 3);
}

type AlternativeDifferentiator =
  | 'cheaper_at_scale'
  | 'faster_setup'
  | 'deeper_automation'
  | 'stronger_governance'
  | 'better_developer_control'
  | 'better_reporting'
  | 'workflow_fit';

function inferAlternativeDifferentiator(reason: string): AlternativeDifferentiator {
  const text = reason.toLowerCase();
  if (/\b(price|pricing|cost|cheaper|budget|seat)\b/.test(text)) return 'cheaper_at_scale';
  if (/\b(fast|faster|quick|setup|onboard|rollout)\b/.test(text)) return 'faster_setup';
  if (/\b(automation|workflow|orchestrat)\b/.test(text)) return 'deeper_automation';
  if (/\b(governance|compliance|audit|control|policy)\b/.test(text)) return 'stronger_governance';
  if (/\b(api|sdk|developer|extensib|code)\b/.test(text)) return 'better_developer_control';
  if (/\b(report|analytics|dashboard|insight)\b/.test(text)) return 'better_reporting';
  return 'workflow_fit';
}

export function buildHunterLaneOutputs(input: {
  toolName: string;
  toolSlug: string;
  entityScope?: HunterEntityScope;
  analysis: HunterAnalysis;
}): HunterLaneOutputs {
  const pros = Array.isArray(input.analysis.pros) ? input.analysis.pros : [];
  const cons = Array.isArray(input.analysis.cons) ? input.analysis.cons : [];
  const userReportedPros = Array.isArray(input.analysis.userReportedPros)
    ? input.analysis.userReportedPros
    : [];
  const userReportedCons = Array.isArray(input.analysis.userReportedCons)
    ? input.analysis.userReportedCons
    : [];

  const officialFacts = [...pros, ...cons]
    .map((claim) => toLaneClaim(claim))
    .filter((claim): claim is HunterLaneClaim => Boolean(claim))
    .filter((claim) => claim.source_type === 'official');

  const officialPricingFacts = officialFacts.filter((claim) => PRICING_TOKENS.test(claim.text));
  const officialLimitFacts = officialFacts.filter((claim) => LIMIT_TOKENS.test(claim.text));

  const mappedUserSignalPros = userReportedPros
    .map((claim) => toLaneClaim(claim))
    .filter((claim): claim is HunterLaneClaim => Boolean(claim))
    .filter((claim) => claim.source_type === 'community' || claim.source_type === 'editorial');
  const mappedUserSignalCons = userReportedCons
    .map((claim) => toLaneClaim(claim))
    .filter((claim): claim is HunterLaneClaim => Boolean(claim))
    .filter((claim) => claim.source_type === 'community' || claim.source_type === 'editorial');

  const decisionIntro =
    input.analysis.reviewContext?.decisionIntro || input.analysis.reviewContext?.decision_intro;
  const editorialSummary =
    typeof decisionIntro?.summary === 'string' && decisionIntro.summary.trim().length > 0
      ? decisionIntro.summary.trim()
      : typeof input.analysis.summary === 'string'
        ? input.analysis.summary.trim()
        : null;
  const bestFor =
    typeof decisionIntro?.best_for === 'string' && decisionIntro.best_for.trim().length > 0
      ? decisionIntro.best_for.trim()
      : null;
  const notFor =
    typeof decisionIntro?.not_for === 'string' && decisionIntro.not_for.trim().length > 0
      ? decisionIntro.not_for.trim()
      : null;
  const mainTradeoff =
    typeof decisionIntro?.main_tradeoff === 'string' &&
    decisionIntro.main_tradeoff.trim().length > 0
      ? decisionIntro.main_tradeoff.trim()
      : null;
  const mainRisk = toMainRiskFromFacts({
    officialLimitFacts,
    officialPricingFacts,
    mainTradeoff,
  });
  const upgradeTrigger = toUpgradeTriggerFromFacts({
    officialLimitFacts,
    officialPricingFacts,
    mainTradeoff,
  });
  const implementationFrictionLevel = inferImplementationFrictionLevel({
    officialLimitFacts,
    mainTradeoff,
  });
  const implementationFrictionDrivers = officialLimitFacts.slice(0, 3).map((claim) => claim.text);
  const implementationFrictionStakeholders = inferImplementationFrictionStakeholders({
    bestFor,
    notFor,
  });
  const fitMatrix = {
    solo: buildLaneFitRow('mixed', bestFor, upgradeTrigger),
    startup: buildLaneFitRow('mixed', bestFor, upgradeTrigger),
    mid_market: buildLaneFitRow('mixed', mainTradeoff, upgradeTrigger),
    enterprise: buildLaneFitRow('weak', notFor, mainTradeoff),
  };
  const checklistItems = [...officialLimitFacts, ...officialFacts]
    .map((entry) => entry.text.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 3);
  const testBeforeBuy = checklistItems.map((item, index) => ({
    name:
      index === 0
        ? 'Daily workflow test'
        : index === 1
          ? 'Admin/setup test'
          : 'Failure/export test',
    why_it_matters: item,
    test: item,
    pass_condition: 'The workflow passes without plan, ownership, or permission blockers.',
    common_failure:
      'A critical step depends on an unsupported tier, integration, or control model.',
  }));
  const pricingReality = {
    free_works_if: officialPricingFacts[0]?.text || null,
    paid_needed_when: upgradeTrigger,
    hidden_cost_triggers: officialLimitFacts.slice(0, 3).map((claim) => claim.text),
    main_cost_drivers: officialPricingFacts.slice(0, 3).map((claim) => claim.text),
    generation_mode: {
      free_works_if: officialPricingFacts[0]?.text ? 'deterministic' : 'suppress',
      paid_needed_when:
        officialLimitFacts.length > 0 || officialPricingFacts.length > 0
          ? 'deterministic'
          : upgradeTrigger
            ? 'llm_phrase_only'
            : 'suppress',
      hidden_cost_triggers: officialLimitFacts.length > 0 ? 'deterministic' : 'suppress',
      main_cost_drivers: officialPricingFacts.length > 0 ? 'deterministic' : 'suppress',
    },
  };
  const alternativesRebuttals = Array.isArray(input.analysis.vetoLogic)
    ? input.analysis.vetoLogic
        .map((row) => {
          const alternative = (row.alternative || '').trim();
          if (!alternative) return null;
          const slug = alternative
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          if (!slug) return null;
          const chooseInsteadIf = (row.condition || row.text || '').trim() || null;
          const reason = (row.reason || '').trim();
          return {
            slug,
            tool_name: alternative,
            choose_instead_if: chooseInsteadIf,
            differentiator: inferAlternativeDifferentiator(reason || chooseInsteadIf || ''),
            confidence: row.source_url ? 'high' : 'medium',
          };
        })
        .filter(
          (
            row
          ): row is {
            slug: string;
            tool_name: string;
            choose_instead_if: string | null;
            differentiator:
              | 'cheaper_at_scale'
              | 'faster_setup'
              | 'deeper_automation'
              | 'stronger_governance'
              | 'better_developer_control'
              | 'better_reporting'
              | 'workflow_fit';
            confidence: 'high' | 'medium' | 'low';
          } => Boolean(row)
        )
        .slice(0, 6)
    : [];

  return {
    subject_profile: {
      subject_type: inferSubjectType(input.entityScope),
      subject_key: `${input.toolSlug}:${input.entityScope || 'core'}`,
      display_name: input.toolName,
      entity_scope: input.entityScope || null,
      confidence: inferSubjectConfidence(input.entityScope),
    },
    fact_sheet: {
      official_facts: officialFacts.slice(0, 12),
      official_pricing_facts: officialPricingFacts.slice(0, 6),
      official_limit_facts: officialLimitFacts.slice(0, 6),
      pricing_reality: pricingReality,
    },
    user_signal_sheet: {
      user_signal_pros: mappedUserSignalPros.slice(0, 8),
      user_signal_cons: mappedUserSignalCons.slice(0, 8),
    },
    editorial_decision: {
      summary: editorialSummary,
      best_for: bestFor,
      not_for: notFor,
      main_tradeoff: mainTradeoff,
      human_verdict:
        typeof input.analysis.reviewContext?.humanVerdict === 'string' &&
        input.analysis.reviewContext.humanVerdict.trim().length > 0
          ? input.analysis.reviewContext.humanVerdict.trim()
          : null,
      main_risk: mainRisk,
      upgrade_trigger: upgradeTrigger,
      implementation_friction_level: implementationFrictionLevel,
      implementation_friction_drivers: implementationFrictionDrivers,
      implementation_friction_stakeholders: implementationFrictionStakeholders,
      fit_matrix: fitMatrix,
      test_before_buy: testBeforeBuy,
      alternatives_rebuttals: alternativesRebuttals,
      generation_mode: {
        summary: editorialSummary ? 'llm_phrase_only' : 'suppress',
        best_for: bestFor ? 'llm_phrase_only' : 'suppress',
        not_for: notFor ? 'llm_phrase_only' : 'suppress',
        main_tradeoff: mainTradeoff ? 'llm_phrase_only' : 'suppress',
        main_risk:
          officialLimitFacts.length > 0 || officialPricingFacts.length > 0
            ? 'deterministic'
            : mainRisk
              ? 'llm_phrase_only'
              : 'suppress',
        upgrade_trigger:
          officialLimitFacts.length > 0 || officialPricingFacts.length > 0
            ? 'deterministic'
            : upgradeTrigger
              ? 'llm_phrase_only'
              : 'suppress',
        implementation_friction:
          implementationFrictionLevel && officialLimitFacts.length > 0
            ? 'deterministic'
            : implementationFrictionLevel
              ? 'llm_phrase_only'
              : 'suppress',
        fit_matrix: 'suppress',
        test_before_buy: testBeforeBuy.length > 0 ? 'deterministic' : 'suppress',
        alternatives_rebuttals: alternativesRebuttals.some((row) => row.confidence === 'high')
          ? 'extractive'
          : alternativesRebuttals.length > 0
            ? 'llm_phrase_only'
            : 'suppress',
      },
    },
  };
}

export function extractLaneClaimTexts(
  claims: Array<string | ClaimWithSource> | undefined
): string[] {
  if (!Array.isArray(claims)) return [];
  return claims.map((claim) => readClaimText(claim).trim()).filter((text) => text.length > 0);
}
