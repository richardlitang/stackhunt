import { z } from 'zod';

export const PricingV2ValidationStatusSchema = z.enum(['verified', 'inferred', 'conflicted']);

export const PricingV2PolicySnapshotSchema = z.object({
  acquisition_mode: z.enum(['LINK_ONLY', 'API_ONLY', 'SCRAPE_ALLOWED', 'BLOCKED']),
  llm_ingestion_allowed: z.enum(['NO', 'YES_LIMITED', 'YES']),
  policy_version: z.string().optional(),
});

export const PricingV2EvidenceRefSchema = z.object({
  url: z.string().url(),
  source_type: z.enum(['official', 'docs', 'support', 'legal', 'editorial', 'community']),
  retrieved_at: z.string(),
  claim_id: z.string().min(1),
  policy_snapshot: PricingV2PolicySnapshotSchema,
});

export const PricingV2MeterSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit_ucum: z.string().min(1),
  category: z.enum(['team', 'usage', 'resource', 'audience', 'money']),
});

export const PricingV2TierSchema = z.object({
  up_to: z.number().positive().nullable().optional(),
  unit_price: z.number().nonnegative().nullable().optional(),
  package_size: z.number().positive().nullable().optional(),
  package_price: z.number().nonnegative().nullable().optional(),
  percent_rate: z.number().nonnegative().nullable().optional(),
});

export const PricingV2PriceComponentSchema = z
  .object({
    id: z.string().min(1),
    component_kind: z.enum(['base', 'addon', 'overage']),
    meter_id: z.string().nullable(),
    rate_type: z.enum([
      'flat',
      'unit',
      'tiered_graduated',
      'tiered_volume',
      'package',
      'percentage',
    ]),
    cadence: z.enum(['monthly', 'annual', 'one_time']),
    timing: z.enum(['in_advance', 'in_arrears']),
    currency: z.string().length(3),
    min_units: z.number().nonnegative().nullable().optional(),
    included_units: z.number().nonnegative().nullable().optional(),
    max_units: z.number().positive().nullable().optional(),
    is_optional: z.boolean(),
    requires_component_ids: z.array(z.string()).optional(),
    flat_price: z.number().nonnegative().nullable().optional(),
    unit_price: z.number().nonnegative().nullable().optional(),
    tiers: z.array(PricingV2TierSchema).nullable().optional(),
    percent_rate: z.number().nonnegative().nullable().optional(),
    min_charge: z.number().nonnegative().nullable().optional(),
    max_charge: z.number().nonnegative().nullable().optional(),
    rounding_mode: z.enum(['ceil', 'floor', 'nearest']).optional(),
    overage_mode: z.enum(['none', 'unit_overage', 'tiered_overage']).optional(),
    evidence: z.array(PricingV2EvidenceRefSchema).min(1),
    notes: z.string().nullable().optional(),
    validation_status: PricingV2ValidationStatusSchema,
    needs_review: z.boolean().optional(),
  })
  .superRefine((component, ctx) => {
    if (component.rate_type === 'flat' && component.flat_price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'flat rate_type requires flat_price',
      });
    }
    if (component.rate_type === 'unit' && component.unit_price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'unit rate_type requires unit_price',
      });
    }
    if (
      (component.rate_type === 'tiered_graduated' || component.rate_type === 'tiered_volume') &&
      (!component.tiers || component.tiers.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tiered rate_type requires tiers',
      });
    }
    if (component.rate_type === 'package' && (!component.tiers || component.tiers.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'package rate_type requires tiers with package_size/package_price',
      });
    }
    if (component.rate_type === 'percentage' && component.percent_rate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'percentage rate_type requires percent_rate',
      });
    }
  });

export const PricingV2PlanBillingOptionSchema = z.object({
  cadence: z.enum(['monthly', 'annual']),
  price_components: z.array(PricingV2PriceComponentSchema),
});

export const PricingV2PlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  is_free: z.boolean(),
  is_enterprise: z.boolean(),
  billing_options: z.array(PricingV2PlanBillingOptionSchema),
  contract_terms: z
    .object({
      annual_only: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  evidence: z.array(PricingV2EvidenceRefSchema).min(1),
});

export const PricingV2ProductPricingSchema = z.object({
  product_id: z.string().min(1),
  official_pricing_url: z.string().url().nullable(),
  currency_default: z.string().length(3),
  meters: z.array(PricingV2MeterSchema).min(1),
  plans: z.array(PricingV2PlanSchema).min(1),
  last_verified_at: z.string().nullable(),
  confidence: z.enum(['high', 'med', 'low']),
  conflicts: z.array(
    z.object({
      key: z.string(),
      values: z.array(z.unknown()),
      urls: z.array(z.string().url()),
    })
  ),
});

