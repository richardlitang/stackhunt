/**
 * Schema Validator - Validate LLM outputs before persistence
 *
 * Catches malformed responses from Gemini before they break the UI/DB.
 * Uses Zod for runtime type checking.
 *
 * @module hunter/validation/schema-validator
 */

import { z } from 'zod';
import type { KnowledgeCard } from '@/lib/knowledge-card';

const TERMINAL_PUNCTUATION = /[.:;!?…"'`”’)\]]+$/g;
const CONTROL_CHARS_REGEX = /[\p{Cc}\u200B-\u200D\u2060\uFEFF]/gu;
const INCOMPLETE_CLAUSE_ENDING =
  /\b(to|for|with|from|into|onto|on|at|by|of|in|as|than|that|which|who|when|where|if|because|while|and|or|but|via|per)\s*$/i;
const COMMUNITY_HEDGING_PREFIX =
  /^(users report(?: that)?|community (?:reports|mentions|consensus (?:is|suggests)|feedback)|according to (?:reddit|hn|community)|based on user discussions)/i;
const GENERIC_NARRATIVE_PATTERNS = [
  /\bworth shortlisting\b/i,
  /\brobust and powerful solution\b/i,
  /\bbest-in-class capabilities\b/i,
  /\bstrong option(?: based on)?(?: the)? current source-backed evidence\b/i,
  /\bsolid choice for modern teams\b/i,
  /\bbest value threshold\b/i,
  /\bworth it when\b/i,
  /\bplatform access is limited to web-based environments\b/i,
];

function normalizeClaimText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, ' ')
    .replace(TERMINAL_PUNCTUATION, '')
    .trim();
}

function isLikelyIncompleteClaim(text: string): boolean {
  const normalized = normalizeClaimText(text);
  if (!normalized) return true;
  if (normalized.length < 12) return false;
  return INCOMPLETE_CLAUSE_ENDING.test(normalized);
}

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Single validation result
 */
export interface ValidationResult {
  field: string;
  severity: ValidationSeverity;
  message: string;
  value?: unknown;
  autofix?: () => void;
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  isValid: boolean;
  score: number; // 0-100
  validations: ValidationResult[];
  shouldPublish: boolean; // Gate low-quality content
  humanReviewRequired: boolean;
}

/**
 * Zod schema for pricing validation
 */
const PricingPlanSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Plan name cannot be empty'),
    price_monthly: z
      .number()
      .nullable()
      .refine(
        (val) => val === null || (val >= 0 && val < 100000),
        'Monthly price must be between $0-$100k'
      ),
    price_annual: z
      .number()
      .nullable()
      .refine(
        (val) => val === null || (val >= 0 && val < 1000000),
        'Annual price must be between $0-$1M'
      ),
    price_per_unit: z.number().nullable().optional(),
    scaling_unit: z.string().nullable().optional(),
    max_users: z
      .number()
      .nullable()
      .refine(
        (val) => val === null || (val > 0 && val < 1000000),
        'Max users must be positive and < 1M'
      )
      .optional(),
    included_units: z.number().nullable().optional(),
    includes_sso: z.boolean().nullable().optional(),
    includes_api: z.boolean().nullable().optional(),
    includes_sla: z.boolean().nullable().optional(),
  })
  .passthrough();

const SMPPricingSchema = z
  .object({
    model: z.enum([
      'free',
      'flat',
      'per_seat',
      'per_unit',
      'tiered',
      'hybrid',
      'contact_sales',
      'ad_spend',
      'usage_based',
    ]),
    confidence: z.enum(['high', 'medium', 'low']),
    currency: z.string().length(3, 'Currency must be 3-letter code'),
    billing_cycles: z.array(z.string()).nullable().optional(),
    annual_discount_pct: z.number().min(0).max(100).nullable().optional(),
    min_seats: z.number().min(1).nullable().optional(),
    bundled_in: z.string().nullable().optional(),
    plans: z.array(PricingPlanSchema).nullable().optional(),
  })
  .passthrough();

/**
 * Zod schema for company validation
 */
const CompanySchema = z
  .object({
    name: z.string().min(1, 'Company name required').optional(),
    founded_year: z
      .number()
      .min(1950, 'Founded year must be >= 1950')
      .max(new Date().getFullYear(), 'Founded year cannot be in the future')
      .nullable()
      .optional(),
    headquarters: z.string().nullable().optional(),
    employee_count: z.string().nullable().optional(),
    funding_stage: z.string().nullable().optional(),
  })
  .passthrough();

/**
 * Validate Knowledge Card structure and business rules
 */
export function validateKnowledgeCard(
  knowledgeCard: KnowledgeCard,
  _toolName: string
): ValidationReport {
  const validations: ValidationResult[] = [];
  let errorCount = 0;

  // 1. Schema validation - Company
  if (knowledgeCard.company) {
    const companyResult = CompanySchema.safeParse(knowledgeCard.company);
    if (!companyResult.success) {
      companyResult.error.errors.forEach((err) => {
        validations.push({
          field: `company.${err.path.join('.')}`,
          severity: 'error',
          message: err.message,
          value: err.path.reduce((obj, key) => (obj as any)?.[key], knowledgeCard.company),
        });
        errorCount++;
      });
    }
  }

  // 2. Schema validation - Pricing
  if (knowledgeCard.smp_pricing) {
    const pricingResult = SMPPricingSchema.safeParse(knowledgeCard.smp_pricing);
    if (!pricingResult.success) {
      pricingResult.error.errors.forEach((err) => {
        validations.push({
          field: `smp_pricing.${err.path.join('.')}`,
          severity: 'error',
          message: err.message,
          value: err.path.reduce((obj, key) => (obj as any)?.[key], knowledgeCard.smp_pricing),
        });
        errorCount++;
      });
    }
  }

  // 3. Business rule: Website URL format
  if (knowledgeCard.website_url) {
    try {
      const url = new URL(knowledgeCard.website_url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        validations.push({
          field: 'website_url',
          severity: 'error',
          message: 'Website URL must use http or https protocol',
          value: knowledgeCard.website_url,
        });
        errorCount++;
      }
    } catch {
      validations.push({
        field: 'website_url',
        severity: 'error',
        message: 'Invalid website URL format',
        value: knowledgeCard.website_url,
      });
      errorCount++;
    }
  }

  // 4. Completeness checks
  const requiredFields = [
    { field: 'company.name', value: knowledgeCard.company?.name, severity: 'warning' as const },
    {
      field: 'tagline',
      value: knowledgeCard.tagline,
      severity: 'warning' as const,
    },
    {
      field: 'features.core',
      value: knowledgeCard.features?.core?.length,
      severity: 'warning' as const,
    },
    {
      field: 'smp_taxonomy.primary_function',
      value: knowledgeCard.smp_taxonomy?.primary_function,
      severity: 'warning' as const,
    },
  ];

  requiredFields.forEach(({ field, value, severity }) => {
    if (!value) {
      validations.push({
        field,
        severity,
        message: `Missing recommended field: ${field}`,
      });
    }
  });

  // 5. Data quality score (0-100)
  const qualityChecks = [
    { check: !!knowledgeCard.company?.name, weight: 10 },
    { check: !!knowledgeCard.company?.founded_year, weight: 5 },
    { check: !!knowledgeCard.tagline, weight: 10 },
    { check: (knowledgeCard.features?.core?.length || 0) >= 3, weight: 15 },
    { check: (knowledgeCard.features?.unique?.length || 0) >= 1, weight: 10 },
    { check: !!knowledgeCard.smp_pricing, weight: 15 },
    { check: !!knowledgeCard.smp_taxonomy?.primary_function, weight: 10 },
    { check: (knowledgeCard.competitive?.main_alternatives?.length || 0) >= 2, weight: 10 },
    { check: !!knowledgeCard.integrations?.has_api, weight: 5 },
    { check: !!knowledgeCard.smp_portability, weight: 5 },
    { check: !!knowledgeCard.learning_curve, weight: 5 },
  ];

  const maxScore = qualityChecks.reduce((sum, { weight }) => sum + weight, 0);
  const actualScore = qualityChecks
    .filter(({ check }) => check)
    .reduce((sum, { weight }) => sum + weight, 0);
  const score = Math.round((actualScore / maxScore) * 100);

  // 6. Publishing decision
  const shouldPublish = errorCount === 0 && score >= 50; // At least 50% complete
  const humanReviewRequired = score < 70; // Flag for review if < 70%

  return {
    isValid: errorCount === 0,
    score,
    validations,
    shouldPublish,
    humanReviewRequired,
  };
}

/**
 * Validate Analysis output (synthesis results)
 */
export function validateAnalysis(analysis: {
  score: number;
  pros: Array<{ text: string; source?: string; source_type?: string; claim_type?: string }>;
  cons: Array<{ text: string; source?: string; source_type?: string; claim_type?: string }>;
  userReportedPros?: Array<{
    text: string;
    source?: string;
    source_type?: string;
    claim_type?: string;
  }>;
  userReportedCons?: Array<{
    text: string;
    source?: string;
    source_type?: string;
    claim_type?: string;
  }>;
  summary: string;
  verdict?: string | null;
  reviewContext?: {
    decisionIntro?: {
      what_it_is?: string | null;
      best_for?: string | null;
      not_for?: string | null;
      main_tradeoff?: string | null;
      summary?: string | null;
    } | null;
    decision_intro?: {
      what_it_is?: string | null;
      best_for?: string | null;
      not_for?: string | null;
      main_tradeoff?: string | null;
      summary?: string | null;
    } | null;
    decisionEvidence?: {
      best_for_reason?: {
        text?: string | null;
        source_url?: string | null;
      } | null;
      not_for_reason?: {
        text?: string | null;
        source_url?: string | null;
      } | null;
      tradeoff_reason?: {
        text?: string | null;
        source_url?: string | null;
      } | null;
    } | null;
    decision_evidence?: {
      best_for_reason?: {
        text?: string | null;
        source_url?: string | null;
      } | null;
      not_for_reason?: {
        text?: string | null;
        source_url?: string | null;
      } | null;
      tradeoff_reason?: {
        text?: string | null;
        source_url?: string | null;
      } | null;
    } | null;
  } | null;
  graphTags: {
    functions: string[];
    audiences: string[];
    platforms: string[];
  };
}): ValidationReport {
  const validations: ValidationResult[] = [];
  let errorCount = 0;

  // 1. Score validation
  if (analysis.score < 0 || analysis.score > 100) {
    validations.push({
      field: 'score',
      severity: 'error',
      message: `Score must be 0-100, got ${analysis.score}`,
      value: analysis.score,
    });
    errorCount++;
  }

  // 2. Pros/cons balance
  if (analysis.pros.length === 0) {
    validations.push({
      field: 'pros',
      severity: 'warning',
      message: 'No pros extracted - may indicate extraction failure',
    });
  }

  if (analysis.cons.length === 0) {
    validations.push({
      field: 'cons',
      severity: 'warning',
      message: 'No cons extracted - may indicate overly positive extraction',
    });
  }

  // 3. Source attribution (V2: require sources)
  const prosWithoutSources = analysis.pros.filter((p) => !p.source).length;
  const consWithoutSources = analysis.cons.filter((c) => !c.source).length;

  if (prosWithoutSources > 0) {
    validations.push({
      field: 'pros',
      severity: 'info',
      message: `${prosWithoutSources}/${analysis.pros.length} pros lack source attribution`,
    });
  }

  if (consWithoutSources > 0) {
    validations.push({
      field: 'cons',
      severity: 'info',
      message: `${consWithoutSources}/${analysis.cons.length} cons lack source attribution`,
    });
  }

  const allClaims = [...analysis.pros, ...analysis.cons];
  const malformedClaimCount = allClaims.filter(
    (claim) => !claim?.text || isLikelyIncompleteClaim(claim.text)
  ).length;
  if (malformedClaimCount > 0) {
    validations.push({
      field: 'pros_cons',
      severity: 'warning',
      message: `${malformedClaimCount}/${allClaims.length} claims look malformed or truncated`,
    });
  }

  const officialCommunityHedgingCount = allClaims.filter((claim) => {
    const sourceType = (claim.source_type || '').toLowerCase();
    if (sourceType !== 'official') return false;
    return COMMUNITY_HEDGING_PREFIX.test(normalizeClaimText(claim.text || ''));
  }).length;
  if (officialCommunityHedgingCount > 0) {
    validations.push({
      field: 'pros_cons',
      severity: 'warning',
      message: `${officialCommunityHedgingCount} claims use community-style hedging but cite official sources`,
    });
  }

  // 4. Summary length check
  if (analysis.summary.length < 50) {
    validations.push({
      field: 'summary',
      severity: 'warning',
      message: `Summary too short (${analysis.summary.length} chars)`,
      value: analysis.summary,
    });
  }

  if (analysis.summary.length > 2000) {
    validations.push({
      field: 'summary',
      severity: 'warning',
      message: `Summary too long (${analysis.summary.length} chars) - may hurt SEO`,
      value: analysis.summary.substring(0, 100) + '...',
    });
  }

  // 5. Graph tags completeness
  if (analysis.graphTags.functions.length === 0) {
    validations.push({
      field: 'graphTags.functions',
      severity: 'error',
      message: 'At least one function category required',
    });
    errorCount++;
  }

  const decisionIntro =
    analysis.reviewContext?.decisionIntro || analysis.reviewContext?.decision_intro || null;
  const decisionEvidence =
    analysis.reviewContext?.decisionEvidence || analysis.reviewContext?.decision_evidence || null;
  const decisionFields = [
    'what_it_is',
    'best_for',
    'not_for',
    'main_tradeoff',
  ] as const;
  let decisionIntroBlockingIssues = 0;
  let decisionIntroWarnings = 0;
  let decisionIntroQualityPasses = 0;

  if (!decisionIntro || typeof decisionIntro !== 'object') {
    validations.push({
      field: 'reviewContext.decisionIntro',
      severity: 'error',
      message: 'Missing decision intro block (what_it_is, best_for, not_for, main_tradeoff)',
    });
    errorCount++;
    decisionIntroBlockingIssues++;
  } else {
    for (const field of decisionFields) {
      const value = typeof decisionIntro[field] === 'string' ? decisionIntro[field]!.trim() : '';
      if (value.length < 24) {
        validations.push({
          field: `reviewContext.decisionIntro.${field}`,
          severity: 'error',
          message: `Decision intro field "${field}" is missing or too short`,
          value: decisionIntro[field] ?? null,
        });
        errorCount++;
        decisionIntroBlockingIssues++;
        continue;
      }
      if (GENERIC_NARRATIVE_PATTERNS.some((pattern) => pattern.test(value))) {
        validations.push({
          field: `reviewContext.decisionIntro.${field}`,
          severity: 'warning',
          message: `Decision intro field "${field}" contains generic language`,
          value,
        });
        decisionIntroWarnings++;
        continue;
      }
      decisionIntroQualityPasses += 1;
    }
  }

  if (analysis.verdict && analysis.verdict.trim().length > 0) {
    if (GENERIC_NARRATIVE_PATTERNS.some((pattern) => pattern.test(analysis.verdict || ''))) {
      validations.push({
        field: 'verdict',
        severity: 'warning',
        message: 'Verdict contains generic language',
        value: analysis.verdict,
      });
      decisionIntroWarnings++;
    }
  }
  let decisionEvidenceBlockingIssues = 0;
  let decisionEvidenceQualityPasses = 0;
  if (!decisionEvidence || typeof decisionEvidence !== 'object') {
    validations.push({
      field: 'reviewContext.decisionEvidence',
      severity: 'warning',
      message: 'Missing decision evidence block for best-for/not-for/tradeoff source mapping',
    });
    decisionEvidenceBlockingIssues++;
  } else {
    const evidenceFields = ['best_for_reason', 'not_for_reason', 'tradeoff_reason'] as const;
    for (const field of evidenceFields) {
      const reason = decisionEvidence[field];
      if (!reason || typeof reason !== 'object') continue;
      const text = typeof reason.text === 'string' ? reason.text.trim() : '';
      const sourceUrl = typeof reason.source_url === 'string' ? reason.source_url.trim() : '';
      if (text.length >= 12 && sourceUrl.length >= 10) {
        decisionEvidenceQualityPasses += 1;
      } else {
        validations.push({
          field: `reviewContext.decisionEvidence.${field}`,
          severity: 'warning',
          message: `Decision evidence "${field}" is missing text or source_url`,
          value: reason,
        });
      }
    }
    if (decisionEvidenceQualityPasses === 0) {
      decisionEvidenceBlockingIssues++;
    }
  }

  // 6. Quality score
  const qualityChecks = [
    { check: analysis.score >= 0 && analysis.score <= 100, weight: 20 },
    { check: analysis.pros.length >= 2, weight: 15 },
    { check: analysis.cons.length >= 2, weight: 15 },
    { check: analysis.summary.length >= 100, weight: 15 },
    { check: analysis.graphTags.functions.length > 0, weight: 15 },
    { check: analysis.graphTags.audiences.length > 0, weight: 10 },
    { check: prosWithoutSources === 0, weight: 5 },
    { check: consWithoutSources === 0, weight: 5 },
    { check: malformedClaimCount === 0, weight: 10 },
    { check: officialCommunityHedgingCount === 0, weight: 5 },
    { check: decisionIntroBlockingIssues === 0, weight: 15 },
    { check: decisionIntroWarnings === 0, weight: 5 },
    { check: decisionIntroQualityPasses === decisionFields.length, weight: 5 },
    { check: decisionEvidenceBlockingIssues === 0, weight: 8 },
    { check: decisionEvidenceQualityPasses >= 2, weight: 5 },
  ];

  const maxScore = qualityChecks.reduce((sum, { weight }) => sum + weight, 0);
  const actualScore = qualityChecks
    .filter(({ check }) => check)
    .reduce((sum, { weight }) => sum + weight, 0);
  const score = Math.round((actualScore / maxScore) * 100);
  const hasBlockingClaimIssues =
    malformedClaimCount > 0 ||
    officialCommunityHedgingCount > 0 ||
    decisionIntroBlockingIssues > 0 ||
    decisionIntroWarnings > 0 ||
    decisionEvidenceBlockingIssues > 0;

  return {
    isValid: errorCount === 0,
    score,
    validations,
    shouldPublish: errorCount === 0 && score >= 60 && !hasBlockingClaimIssues,
    humanReviewRequired: score < 80 || hasBlockingClaimIssues,
  };
}

/**
 * Format validation report for logging
 */
export function formatValidationReport(report: ValidationReport, title: string): string {
  const lines = [`\n[Validation: ${title}]`];
  lines.push(`Score: ${report.score}/100`);
  lines.push(`Valid: ${report.isValid ? '✅' : '❌'}`);
  lines.push(`Publish: ${report.shouldPublish ? '✅' : '⚠️  Blocked'}`);
  lines.push(`Human Review: ${report.humanReviewRequired ? '⚠️  Required' : '✅ Not needed'}`);

  if (report.validations.length > 0) {
    lines.push('\nIssues:');
    report.validations.forEach((v) => {
      const icon = v.severity === 'error' ? '❌' : v.severity === 'warning' ? '⚠️ ' : 'ℹ️ ';
      lines.push(`  ${icon} ${v.field}: ${v.message}`);
    });
  }

  return lines.join('\n');
}
