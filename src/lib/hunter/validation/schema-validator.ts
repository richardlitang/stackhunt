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
    price_per_unit: z.number().nullable(),
    scaling_unit: z.string().nullable(),
    max_users: z
      .number()
      .nullable()
      .refine(
        (val) => val === null || (val > 0 && val < 1000000),
        'Max users must be positive and < 1M'
      ),
    included_units: z.number().nullable(),
    includes_sso: z.boolean().nullable(),
    includes_api: z.boolean().nullable(),
    includes_sla: z.boolean().nullable(),
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
    billing_cycles: z.array(z.string()).nullable(),
    annual_discount_pct: z.number().min(0).max(100).nullable(),
    min_seats: z.number().min(1).nullable(),
    bundled_in: z.string().nullable(),
    plans: z.array(PricingPlanSchema).nullable(),
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
  pros: Array<{ text: string; source?: string }>;
  cons: Array<{ text: string; source?: string }>;
  summary: string;
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
  ];

  const maxScore = qualityChecks.reduce((sum, { weight }) => sum + weight, 0);
  const actualScore = qualityChecks
    .filter(({ check }) => check)
    .reduce((sum, { weight }) => sum + weight, 0);
  const score = Math.round((actualScore / maxScore) * 100);

  return {
    isValid: errorCount === 0,
    score,
    validations,
    shouldPublish: errorCount === 0 && score >= 60,
    humanReviewRequired: score < 80,
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
