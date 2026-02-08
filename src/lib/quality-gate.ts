import type { Tool, Review } from '@/types/database';

export interface QualityGateSignals {
  required_sections_complete: boolean;
  mvup_complete: boolean;
  volatiles_fresh: boolean;
  conflicts_count: number;
  has_risky_claims: boolean;
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

function getSectionStatus(
  canShow: boolean,
  fallback: 'hide' | 'procedural' = 'procedural'
): 'show' | 'hide' | 'procedural' {
  if (canShow) return 'show';
  return fallback;
}

function isFresh(dateValue: string | null | undefined, maxAgeDays = FRESHNESS_WINDOW_DAYS): boolean {
  if (!dateValue) return false;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  const ageMs = Date.now() - parsed.getTime();
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

export function evaluateIndexReadiness(tool: Tool, firstReview?: Review | null): IndexReadinessResult {
  const metadata = (tool.metadata as Record<string, any>) || {};
  const specs = (tool.specs as Record<string, any>) || {};
  const knowledgeCard = metadata || {};
  const canonical = (specs.canonical as Record<string, any>) || {};
  const categorySpecificData = (specs.categorySpecificData as Record<string, any>) || {};

  const hasSummary = Boolean(firstReview?.summary_markdown && firstReview.summary_markdown.trim().length >= 40);
  const pricingConflictsCount =
    Number((canonical?.quality as Record<string, unknown> | undefined)?.pricing_conflicts_count || 0) || 0;
  const hasPricing =
    Boolean(knowledgeCard?.smp_pricing || knowledgeCard?.pricing?.tiers?.length > 0) &&
    pricingConflictsCount === 0;
  const hasModels = Boolean(
    (Array.isArray(canonical.latest_models_comparison) && canonical.latest_models_comparison.length > 0) ||
      (Array.isArray(categorySpecificData.model_options) && categorySpecificData.model_options.length > 0)
  );
  const hasSetup = Boolean(
    (Array.isArray(canonical?.setup_tracks?.non_dev) && canonical.setup_tracks.non_dev.length > 0) ||
      (Array.isArray(canonical?.setup_tracks?.dev) && canonical.setup_tracks.dev.length > 0) ||
      (Array.isArray(knowledgeCard?.setup_complexity?.steps) && knowledgeCard.setup_complexity.steps.length > 0)
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
    hasSummary || Boolean(typeof tool.short_description === 'string' && tool.short_description.trim().length >= 40);
  const hasBestFit =
    (Array.isArray(firstReview?.pros) && firstReview!.pros.length >= 2) ||
    Boolean((metadata as Record<string, any>)?.audience?.primary_persona);
  const hasDecisionTriggers =
    hasVerdict ||
    (Array.isArray(firstReview?.cons) && firstReview!.cons.length > 0) ||
    hasPricing;
  const hasImplementationSurface = hasSetup || Boolean(tool.learning_curve);
  const mvupComplete =
    hasWhatItIs &&
    hasBestFit &&
    hasDecisionTriggers &&
    hasImplementationSurface;

  const requiredSectionsComplete = hasSummary && hasPricing && hasModels && hasSetup && hasFaq;

  const volatileFaqs = validFaqs.filter((faq: any) =>
    VOLATILE_FAQ_TERMS.test(`${faq.question || ''} ${faq.answer || ''}`)
  );
  const faqVolatilesFresh = volatileFaqs.every(
    (faq: any) => faq.answer_source_url && faq.answer_source_type === 'official'
  );
  const pricingFresh = isFresh(tool.pricing_verified_at);
  const modelFresh = isFresh(knowledgeCard?.meta?.extraction_date);
  const volatilesFresh = pricingFresh && modelFresh && faqVolatilesFresh;

  const conflictsCount =
    Number(canonical?.quality?.conflicts_count) > 0 ? Number(canonical.quality.conflicts_count) : 0;
  const riskyClaimText = `${firstReview?.summary_markdown || ''} ${(metadata as Record<string, any>)?.humanVerdict || ''}`;
  const hasRiskyClaims = RISKY_ABSOLUTE_CLAIMS.test(riskyClaimText) && eligibleCommunityDomains.length < 2;

  let score = 0;
  if (requiredSectionsComplete) score += 55;
  if (mvupComplete) score += 20;
  if (volatilesFresh) score += 25;
  if (conflictsCount === 0) score += 10;
  if (!hasRiskyClaims) score += 10;

  const reasons: string[] = [];
  if (!requiredSectionsComplete) reasons.push('missing_required_sections');
  if (!mvupComplete) reasons.push('mvup_incomplete');
  if (!volatilesFresh) reasons.push('volatile_facts_not_fresh');
  if (conflictsCount > 0) reasons.push(`conflicts_detected:${conflictsCount}`);
  if (pricingConflictsCount > 0) reasons.push(`pricing_conflicts_detected:${pricingConflictsCount}`);
  if (hasRiskyClaims) reasons.push('UNSUPPORTED_NEGATIVE_CLAIM');

  return {
    signals: {
      required_sections_complete: requiredSectionsComplete,
      mvup_complete: mvupComplete,
      volatiles_fresh: volatilesFresh,
      conflicts_count: conflictsCount,
      has_risky_claims: hasRiskyClaims,
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
      evidence_counts: {
        pricing: hasPricing ? 1 : 0,
        specs: hasSpecs ? 1 : 0,
        faq: validFaqs.length,
        community_domains: eligibleCommunityDomains.length,
        verdict: hasVerdict ? 1 : 0,
      },
    },
    shouldIndex: mvupComplete && volatilesFresh && conflictsCount === 0 && !hasRiskyClaims,
    reasons,
  };
}
