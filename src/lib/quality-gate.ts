import type { Tool, Review } from '@/types/database';

export interface QualityGateSignals {
  required_sections_complete: boolean;
  mvup_complete: boolean;
  volatiles_fresh: boolean;
  conflicts_count: number;
  has_risky_claims: boolean;
  content_contradictions: string[];
  score: number;
  section_publishability: {
    summary: boolean;
    pricing: boolean;
    models: boolean;
    setup: boolean;
    faq: boolean;
    community: boolean;
    specs: boolean;
    verdict: boolean;
  };
  section_status: {
    pricing: 'show' | 'hide' | 'procedural';
    specs: 'show' | 'hide' | 'procedural';
    faq: 'show' | 'hide' | 'procedural';
    community: 'show' | 'hide' | 'procedural';
    verdict: 'show' | 'hide' | 'procedural';
  };
  section_freshness: {
    pricing: { status: 'fresh' | 'stale' | 'unknown'; age_days: number | null };
    setup: { status: 'fresh' | 'stale' | 'unknown'; age_days: number | null };
    faq: { status: 'fresh' | 'stale' | 'unknown'; age_days: number | null };
    community: { status: 'fresh' | 'stale' | 'unknown'; age_days: number | null };
    verdict: { status: 'fresh' | 'stale' | 'unknown'; age_days: number | null };
  };
  evidence_counts: {
    pricing: number;
    specs: number;
    faq: number;
    community_domains: number;
    verdict: number;
  };
}

export interface IndexReadinessResult {
  signals: QualityGateSignals;
  shouldIndex: boolean;
  reasons: string[];
}

const FRESHNESS_WINDOW_DAYS = 120;
const HIGH_VOLATILITY_WINDOW_DAYS = 30;
const BLOCKED_EVIDENCE_DOMAINS = new Set([
  'g2.com',
  'capterra.com',
  'trustpilot.com',
  'reddit.com',
  'old.reddit.com',
  'm.reddit.com',
]);
const VOLATILE_FAQ_TERMS =
  /\b(model|version|pricing|price|plan|quota|limit|token|tokens|rate limit|context window|deprecated|deprecation|gpt|claude|opus|sonnet|haiku|o[1-9])\b/i;
const RISKY_ABSOLUTE_CLAIMS =
  /\b(always|never|broken|scam|unreliable|guaranteed|everyone|nobody)\b/i;
const NEGATIVE_FREE_CLAIM =
  /\b(?:no|not|without|lacks?)\s+(?:a\s+)?free\s+(?:tier|plan|trial)\b|\bno free (?:tier|plan|trial)\b/i;
const POSITIVE_FREE_CLAIM = /\bfree\s+(?:tier|plan|trial)\b|\brobust free plan\b|\bfree forever\b/i;
const NOT_RECOMMENDED_TERMS = /\bnot recommended\b|\bavoid\b|\bskip\b/i;
const RECOMMENDED_TERMS = /\brecommended\b|\bstrong choice\b|\bgood fit\b|\bbest fit\b/i;
export type PopularityTier = 'popular' | 'standard' | 'below_standard';
const AUTHORITATIVE_SOURCE_TYPES = new Set(['official', 'docs', 'support', 'legal']);

function getSectionStatus(
  canShow: boolean,
  fallback: 'hide' | 'procedural' = 'procedural'
): 'show' | 'hide' | 'procedural' {
  if (canShow) return 'show';
  return fallback;
}

function isFresh(
  dateValue: string | null | undefined,
  maxAgeDays = FRESHNESS_WINDOW_DAYS
): boolean {
  if (!dateValue) return false;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  const ageMs = Date.now() - parsed.getTime();
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

function getAgeDays(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor((Date.now() - parsed.getTime()) / (24 * 60 * 60 * 1000));
}

function resolveSectionFreshness(
  dateValue: string | null | undefined,
  maxAgeDays: number
): { status: 'fresh' | 'stale' | 'unknown'; age_days: number | null } {
  const ageDays = getAgeDays(dateValue);
  if (ageDays === null) return { status: 'unknown', age_days: null };
  return {
    status: ageDays <= maxAgeDays ? 'fresh' : 'stale',
    age_days: ageDays,
  };
}

function hasFreePlanSignal(rawPricing: unknown): boolean {
  if (!rawPricing || typeof rawPricing !== 'object') return false;
  const queue: unknown[] = [rawPricing];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    const obj = current as Record<string, unknown>;
    const name = [
      obj.name,
      obj.plan_name,
      obj.tier_name,
      obj.id,
      obj.slug,
      obj.label,
      obj.plan,
      obj.tier,
    ]
      .filter((value) => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    if (/\bfree\b/.test(name)) return true;

    const priceCandidates = [
      obj.price,
      obj.amount,
      obj.price_monthly,
      obj.monthly_price,
      obj.starting_price,
      obj.base_price,
      obj.value,
    ];
    for (const candidate of priceCandidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate === 0)
        return true;
      if (
        typeof candidate === 'string' &&
        /\b(?:\$?\s*0(?:\.0+)?)\b/.test(candidate.trim().toLowerCase())
      ) {
        return true;
      }
    }

    queue.push(...Object.values(obj));
  }
  return false;
}

function detectContentContradictions(params: {
  tool: Tool;
  review?: Review | null;
  knowledgeCard: Record<string, any>;
}): string[] {
  const contradictions: string[] = [];
  const { tool, review, knowledgeCard } = params;
  const pricingData = knowledgeCard?.smp_pricing || knowledgeCard?.pricing || null;
  const hasFreePricingSignal = hasFreePlanSignal(pricingData);
  const textCorpus = [
    review?.summary_markdown || '',
    tool.verdict || '',
    tool.short_description || '',
    ...(Array.isArray(review?.pros) ? review!.pros : []),
    ...(Array.isArray(review?.cons) ? review!.cons : []),
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  const claimsNoFree = NEGATIVE_FREE_CLAIM.test(textCorpus);
  const claimsHasFree = POSITIVE_FREE_CLAIM.test(textCorpus);

  if (hasFreePricingSignal && claimsNoFree) {
    contradictions.push('free_plan_conflict:claims_no_free_but_pricing_has_free');
  }
  if (!hasFreePricingSignal && claimsHasFree) {
    contradictions.push('free_plan_conflict:claims_free_without_pricing_signal');
  }

  if (review?.score !== null && typeof review?.score === 'number') {
    if (review.score >= 70 && NOT_RECOMMENDED_TERMS.test(textCorpus)) {
      contradictions.push('verdict_score_conflict:high_score_with_not_recommended_language');
    }
    if (review.score <= 45 && RECOMMENDED_TERMS.test(textCorpus)) {
      contradictions.push('verdict_score_conflict:low_score_with_recommended_language');
    }
  }

  return contradictions;
}

export function resolvePopularityTier(metadata?: Record<string, unknown> | null): PopularityTier {
  const explicit =
    metadata?.popularity_tier ||
    (metadata?.meta && typeof metadata.meta === 'object'
      ? (metadata.meta as Record<string, unknown>).popularity_tier
      : null);
  const normalized = typeof explicit === 'string' ? explicit.trim().toLowerCase() : '';
  if (normalized === 'popular') return 'popular';
  if (normalized === 'below_standard') return 'below_standard';
  return 'standard';
}

export function evaluateIndexReadiness(
  tool: Tool,
  firstReview?: Review | null
): IndexReadinessResult {
  const metadata = (tool.metadata as Record<string, any>) || {};
  const popularityTier = resolvePopularityTier(metadata);
  const isDiscoveryReview = (firstReview as any)?.context_id == null;
  const specs = (tool.specs as Record<string, any>) || {};
  const knowledgeCard = metadata || {};
  const canonical = (specs.canonical as Record<string, any>) || {};
  const categorySpecificData = (specs.categorySpecificData as Record<string, any>) || {};
  const taxonomyPrimary =
    typeof knowledgeCard?.smp_taxonomy?.primary_function === 'string'
      ? knowledgeCard.smp_taxonomy.primary_function.toLowerCase()
      : '';
  const categoryHint = `${tool.category?.slug || ''} ${taxonomyPrimary}`.toLowerCase();
  const isModelCategory = /\b(ai|automation|model|llm|assistant|developer-tools)\b/.test(
    categoryHint
  );
  const isPaymentsOrFinanceCategory =
    /\b(payment|payments|bank|banking|finance|financial|accounting|treasury|billing)\b/.test(
      categoryHint
    );

  const hasSummary = Boolean(
    (firstReview?.summary_markdown && firstReview.summary_markdown.trim().length >= 40) ||
    (typeof tool.verdict === 'string' && tool.verdict.trim().length >= 40) ||
    (typeof tool.short_description === 'string' && tool.short_description.trim().length >= 80)
  );
  const pricingConflictsCount =
    Number(
      (canonical?.quality as Record<string, unknown> | undefined)?.pricing_conflicts_count || 0
    ) || 0;
  const hasPricingSignalsInCategoryData = Object.keys(categorySpecificData).some((key) =>
    /\b(price|pricing|cost|fee|rate|monthly|overage|transaction)\b/i.test(key)
  );
  const hasHiddenCosts = Array.isArray(
    (specs.constraints as Record<string, unknown> | undefined)?.hidden_costs
  )
    ? ((specs.constraints as Record<string, unknown>).hidden_costs as unknown[]).length > 0
    : false;
  const hasPricing =
    Boolean(
      knowledgeCard?.smp_pricing ||
      knowledgeCard?.pricing?.tiers?.length > 0 ||
      hasPricingSignalsInCategoryData ||
      hasHiddenCosts
    ) && pricingConflictsCount === 0;
  const hasModels = Boolean(
    (Array.isArray(canonical.latest_models_comparison) &&
      canonical.latest_models_comparison.length > 0) ||
    (Array.isArray(categorySpecificData.model_options) &&
      categorySpecificData.model_options.length > 0)
  );
  const hasStructuredSetup = Boolean(
    (Array.isArray(canonical?.setup_tracks?.non_dev) &&
      canonical.setup_tracks.non_dev.length > 0) ||
    (Array.isArray(canonical?.setup_tracks?.dev) && canonical.setup_tracks.dev.length > 0) ||
    (Array.isArray(knowledgeCard?.setup_complexity?.steps) &&
      knowledgeCard.setup_complexity.steps.length > 0)
  );
  const validFaqs = Array.isArray(knowledgeCard?.faqs)
    ? knowledgeCard.faqs.filter((faq: any) => {
        if (!faq?.question || !faq?.answer || !faq?.answer_source_url) return false;
        if (VOLATILE_FAQ_TERMS.test(`${faq.question || ''} ${faq.answer || ''}`)) {
          return faq.answer_source_type === 'official';
        }
        return true;
      })
    : [];
  const hasFaq = validFaqs.length > 0;
  const sourceDomains = new Set(
    Array.isArray(firstReview?.sources)
      ? (firstReview!.sources as Array<{ domain?: string; url?: string }>)
          .map((source) => {
            if (source.domain && typeof source.domain === 'string') {
              return source.domain.replace(/^www\./, '').toLowerCase();
            }
            if (source.url && typeof source.url === 'string') {
              try {
                return new URL(source.url).hostname.replace(/^www\./, '').toLowerCase();
              } catch {
                return null;
              }
            }
            return null;
          })
          .filter((domain): domain is string => Boolean(domain))
      : []
  );
  const sourceEntries = Array.isArray(firstReview?.sources)
    ? (firstReview!.sources as Array<{
        domain?: string;
        url?: string;
        source_type?: string;
        type?: string;
      }>)
    : [];
  const hasSetupEvidenceFromSources = sourceEntries.some((source) => {
    const sourceType = ((source.source_type || source.type || '') as string).toLowerCase();
    if (!AUTHORITATIVE_SOURCE_TYPES.has(sourceType)) return false;
    const lowerUrl = (source.url || '').toLowerCase();
    return /\/(docs?|help|support|guides?|quickstart|get-started|getting-started|onboarding|setup|tutorials?|install|start)/.test(
      lowerUrl
    );
  });
  const hasSetup = hasStructuredSetup || hasSetupEvidenceFromSources;
  let authoritativeSourceCount = 0;
  const authoritativeDomains = new Set<string>();
  for (const source of sourceEntries) {
    const sourceType = ((source.source_type || source.type || '') as string).toLowerCase();
    if (!AUTHORITATIVE_SOURCE_TYPES.has(sourceType)) continue;
    authoritativeSourceCount += 1;
    const domain = source.domain?.replace(/^www\./, '').toLowerCase() || null;
    if (domain) authoritativeDomains.add(domain);
    else if (source.url && typeof source.url === 'string') {
      try {
        authoritativeDomains.add(new URL(source.url).hostname.replace(/^www\./, '').toLowerCase());
      } catch {
        // Ignore malformed source URLs in gate scoring.
      }
    }
  }
  const strongDiscoveryEvidence =
    isDiscoveryReview &&
    hasSummary &&
    authoritativeSourceCount >= 3 &&
    authoritativeDomains.size >= 1;
  const eligibleCommunityDomains = Array.from(sourceDomains).filter(
    (domain) =>
      !Array.from(BLOCKED_EVIDENCE_DOMAINS).some(
        (blockedDomain) => domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
      )
  );
  const hasCommunity = eligibleCommunityDomains.length >= 3;
  const hasSpecs = hasModels || Boolean(categorySpecificData);
  const hasVerdict = Boolean(
    hasSummary ||
    (typeof tool.verdict === 'string' && tool.verdict.trim().length >= 20) ||
    (typeof (metadata as Record<string, any>)?.humanVerdict === 'string' &&
      (metadata as Record<string, any>).humanVerdict.trim().length >= 20)
  );
  const hasWhatItIs =
    hasSummary ||
    Boolean(
      typeof tool.short_description === 'string' && tool.short_description.trim().length >= 40
    );
  const hasBestFit =
    (Array.isArray(firstReview?.pros) && firstReview!.pros.length >= 2) ||
    Boolean((metadata as Record<string, any>)?.audience?.primary_persona);
  const hasDecisionTriggers =
    hasVerdict || (Array.isArray(firstReview?.cons) && firstReview!.cons.length > 0) || hasPricing;
  const hasImplementationSurface = hasSetup || Boolean(tool.learning_curve);
  const mvupComplete = (() => {
    if (strongDiscoveryEvidence) {
      // Discovery reviews have no context-specific "best fit"; allow procedural fit if evidence is strong.
      return hasWhatItIs && (hasDecisionTriggers || hasSpecs) && hasImplementationSurface;
    }
    if (popularityTier === 'popular') {
      return (
        hasWhatItIs && hasBestFit && (hasDecisionTriggers || hasSpecs) && hasImplementationSurface
      );
    }
    if (popularityTier === 'below_standard') {
      return hasWhatItIs && hasBestFit && hasDecisionTriggers && hasImplementationSurface && hasFaq;
    }
    return hasWhatItIs && hasBestFit && hasDecisionTriggers && hasImplementationSurface;
  })();

  const requiredSectionsComplete = (() => {
    if (strongDiscoveryEvidence) {
      // Discovery pages can publish with procedural sections when backed by strong authoritative evidence.
      return hasSummary && hasSetup && (hasPricing || hasSpecs || hasFaq || hasModels);
    }
    if (popularityTier === 'popular') {
      if (isModelCategory) {
        return hasSummary && hasSetup && (hasPricing || hasSpecs || hasModels);
      }
      if (isPaymentsOrFinanceCategory) {
        return hasSummary && hasSetup && (hasSpecs || hasPricing);
      }
      return hasSummary && hasSetup && (hasPricing || hasSpecs);
    }
    if (popularityTier === 'below_standard') {
      if (isModelCategory) {
        return hasSummary && hasPricing && hasSetup && hasSpecs && hasModels && hasFaq;
      }
      if (isPaymentsOrFinanceCategory) {
        return hasSummary && hasPricing && hasSetup && hasSpecs && hasFaq;
      }
      return hasSummary && hasPricing && hasSetup && hasFaq && hasSpecs;
    }
    if (isModelCategory) {
      return hasSummary && hasPricing && hasSetup && hasSpecs && (hasModels || hasFaq);
    }
    if (isPaymentsOrFinanceCategory) {
      return hasSummary && hasSetup && hasSpecs;
    }
    return hasSummary && hasPricing && hasSetup && (hasFaq || hasSpecs);
  })();

  const volatileFaqs = validFaqs.filter((faq: any) =>
    VOLATILE_FAQ_TERMS.test(`${faq.question || ''} ${faq.answer || ''}`)
  );
  const faqVolatilesFresh = volatileFaqs.every(
    (faq: any) => faq.answer_source_url && faq.answer_source_type === 'official'
  );
  const pricingFresh = isFresh(
    tool.pricing_verified_at || knowledgeCard?.meta?.extraction_date || tool.updated_at,
    HIGH_VOLATILITY_WINDOW_DAYS
  );
  const modelFresh = isFresh(knowledgeCard?.meta?.extraction_date);
  const volatilesFresh = pricingFresh && faqVolatilesFresh && (isModelCategory ? modelFresh : true);

  const conflictsCount =
    Number(canonical?.quality?.conflicts_count) > 0 ? Number(canonical.quality.conflicts_count) : 0;
  const contentContradictions = detectContentContradictions({
    tool,
    review: firstReview,
    knowledgeCard,
  });
  const totalConflicts = conflictsCount + contentContradictions.length;
  const riskyClaimText = `${firstReview?.summary_markdown || ''} ${(metadata as Record<string, any>)?.humanVerdict || ''}`;
  const hasRiskyClaims =
    RISKY_ABSOLUTE_CLAIMS.test(riskyClaimText) && eligibleCommunityDomains.length < 2;

  let score = 0;
  if (requiredSectionsComplete) score += 55;
  if (mvupComplete) score += 20;
  if (volatilesFresh) score += 25;
  if (totalConflicts === 0) score += 10;
  if (!hasRiskyClaims) score += 10;

  const reasons: string[] = [];
  if (!requiredSectionsComplete) reasons.push('missing_required_sections');
  if (!mvupComplete) reasons.push('mvup_incomplete');
  if (!volatilesFresh) reasons.push('volatile_facts_not_fresh');
  if (conflictsCount > 0) reasons.push(`conflicts_detected:${conflictsCount}`);
  if (contentContradictions.length > 0) {
    reasons.push(...contentContradictions.map((code) => `content_contradiction:${code}`));
  }
  if (pricingConflictsCount > 0)
    reasons.push(`pricing_conflicts_detected:${pricingConflictsCount}`);
  if (hasRiskyClaims) reasons.push('UNSUPPORTED_NEGATIVE_CLAIM');

  return {
    signals: {
      required_sections_complete: requiredSectionsComplete,
      mvup_complete: mvupComplete,
      volatiles_fresh: volatilesFresh,
      conflicts_count: totalConflicts,
      has_risky_claims: hasRiskyClaims,
      content_contradictions: contentContradictions,
      score,
      section_publishability: {
        summary: hasSummary,
        pricing: hasPricing,
        models: hasModels,
        setup: hasSetup,
        faq: hasFaq,
        community: hasCommunity,
        specs: hasSpecs,
        verdict: hasVerdict,
      },
      section_status: {
        pricing: getSectionStatus(hasPricing, 'procedural'),
        specs: getSectionStatus(hasSpecs, 'procedural'),
        faq: getSectionStatus(hasFaq, 'hide'),
        community: getSectionStatus(hasCommunity, 'procedural'),
        verdict: getSectionStatus(hasVerdict, 'procedural'),
      },
      section_freshness: {
        pricing: resolveSectionFreshness(
          tool.pricing_verified_at || knowledgeCard?.meta?.extraction_date || tool.updated_at,
          HIGH_VOLATILITY_WINDOW_DAYS
        ),
        setup: resolveSectionFreshness(
          knowledgeCard?.setup_complexity?.updated_at ||
            knowledgeCard?.setup_complexity?.checked_at ||
            knowledgeCard?.meta?.extraction_date,
          FRESHNESS_WINDOW_DAYS
        ),
        faq: resolveSectionFreshness(
          Array.isArray(validFaqs) && validFaqs.length > 0
            ? validFaqs
                .map((faq: any) => faq.answer_checked_at || faq.retrieved_at || faq.checked_at)
                .find((value: string | null | undefined) => Boolean(value))
            : null,
          HIGH_VOLATILITY_WINDOW_DAYS
        ),
        community: resolveSectionFreshness(firstReview?.updated_at || null, FRESHNESS_WINDOW_DAYS),
        verdict: resolveSectionFreshness(
          firstReview?.updated_at || tool.updated_at,
          FRESHNESS_WINDOW_DAYS
        ),
      },
      evidence_counts: {
        pricing: hasPricing ? 1 : 0,
        specs: hasSpecs ? 1 : 0,
        faq: validFaqs.length,
        community_domains: eligibleCommunityDomains.length,
        verdict: hasVerdict ? 1 : 0,
      },
    },
    shouldIndex: mvupComplete && volatilesFresh && totalConflicts === 0 && !hasRiskyClaims,
    reasons,
  };
}
