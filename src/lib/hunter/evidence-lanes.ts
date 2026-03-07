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

function inferSubjectType(entityScope?: HunterEntityScope): HunterLaneOutputs['subject_profile']['subject_type'] {
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
    },
    user_signal_sheet: {
      user_signal_pros: mappedUserSignalPros.slice(0, 8),
      user_signal_cons: mappedUserSignalCons.slice(0, 8),
    },
    editorial_decision: {
      summary: editorialSummary,
      best_for:
        typeof decisionIntro?.best_for === 'string' && decisionIntro.best_for.trim().length > 0
          ? decisionIntro.best_for.trim()
          : null,
      not_for:
        typeof decisionIntro?.not_for === 'string' && decisionIntro.not_for.trim().length > 0
          ? decisionIntro.not_for.trim()
          : null,
      main_tradeoff:
        typeof decisionIntro?.main_tradeoff === 'string' &&
        decisionIntro.main_tradeoff.trim().length > 0
          ? decisionIntro.main_tradeoff.trim()
          : null,
      human_verdict:
        typeof input.analysis.reviewContext?.humanVerdict === 'string' &&
        input.analysis.reviewContext.humanVerdict.trim().length > 0
          ? input.analysis.reviewContext.humanVerdict.trim()
          : null,
    },
  };
}

export function extractLaneClaimTexts(claims: Array<string | ClaimWithSource> | undefined): string[] {
  if (!Array.isArray(claims)) return [];
  return claims
    .map((claim) => readClaimText(claim).trim())
    .filter((text) => text.length > 0);
}
