/**
 * Knowledge Card Schema
 *
 * Structured facts extracted by the Hunter "Librarian" pass.
 * This provides the foundation for comparison tables and fact-based reviews.
 */

import { z } from 'zod';

// Confidence level for extracted facts
export const ConfidenceLevel = z.enum(['verified', 'inferred', 'unknown']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

// Fact with confidence tracking
const FactWithConfidence = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    value: schema,
    confidence: ConfidenceLevel.default('inferred'),
    source_url: z.string().url().optional(),
  });

// Pricing tier structure
export const PricingTierSchema = z.object({
  name: z.string(),                        // "Free", "Pro", "Enterprise"
  price: z.string().nullable(),            // "$9/mo", "Custom", null if unknown
  billing_period: z.enum(['monthly', 'yearly', 'one-time', 'custom']).nullable().optional(),
  features: z.array(z.string()).default([]),
});
export type PricingTier = z.infer<typeof PricingTierSchema>;

// Integration/connection
export const IntegrationSchema = z.object({
  name: z.string(),                        // "Slack", "Google Drive"
  type: z.enum(['native', 'api', 'zapier', 'webhook', 'plugin']),
  direction: z.enum(['import', 'export', 'bidirectional']).nullable().optional(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

// Platform availability
export const PlatformAvailabilitySchema = z.object({
  platform: z.enum(['web', 'mac', 'windows', 'linux', 'ios', 'android', 'cli', 'api', 'self-hosted']),
  available: z.boolean(),
  notes: z.string().nullable().optional(),            // "Beta", "Via PWA", etc.
});
export type PlatformAvailability = z.infer<typeof PlatformAvailabilitySchema>;

// Feature capability
export const FeatureCapabilitySchema = z.object({
  name: z.string(),                        // "Offline Mode", "Real-time Collaboration"
  status: z.enum(['full', 'partial', 'none', 'planned', 'beta']),
  notes: z.string().nullable().optional(),
});
export type FeatureCapability = z.infer<typeof FeatureCapabilitySchema>;

// =============================================================================
// MAIN KNOWLEDGE CARD SCHEMA
// =============================================================================

export const KnowledgeCardSchema = z.object({
  // === IDENTITY ===
  official_name: z.string(),
  tagline: z.string().nullable().optional(),          // Official tagline if found
  website_url: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),

  // === COMPANY INFO ===
  company: z.object({
    name: z.string().nullable().optional(),
    founded_year: z.number().int().min(1970).max(2030).nullable().optional(),
    headquarters: z.string().nullable().optional(),   // "San Francisco, CA"
    employee_count: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).nullable().optional(),
    funding_stage: z.enum(['bootstrapped', 'seed', 'series-a', 'series-b', 'series-c+', 'public', 'acquired']).nullable().optional(),
  }).default({}),

  // === PRICING ===
  pricing: z.object({
    model: z.enum(['free', 'freemium', 'paid', 'enterprise', 'open_source']),
    has_free_tier: z.boolean(),
    has_free_trial: z.boolean(),
    trial_days: z.number().int().nullable().default(null),
    starting_price: z.string().nullable().default(null), // "$5/user/mo"
    tiers: z.array(PricingTierSchema).default([]),
  }),

  // === PLATFORMS ===
  platforms: z.array(PlatformAvailabilitySchema).default([]),

  // === FEATURES ===
  features: z.object({
    core: z.array(z.string()).default([]), // Main capabilities
    unique: z.array(z.string()).default([]), // What sets it apart
    capabilities: z.array(FeatureCapabilitySchema).default([]),
  }).default({}),

  // === INTEGRATIONS ===
  integrations: z.object({
    total_count: z.number().int().nullable().optional(),
    notable: z.array(IntegrationSchema).default([]),
    has_api: z.boolean().optional().default(false),
    has_webhooks: z.boolean().optional().default(false),
    has_zapier: z.boolean().optional().default(false),
  }).default({}),

  // === TARGET AUDIENCE ===
  audience: z.object({
    primary: z.array(z.string()).default([]),  // "Developers", "Small Teams"
    use_cases: z.array(z.string()).default([]), // "Project Management", "Note-Taking"
    team_size: z.enum(['solo', 'small', 'medium', 'enterprise', 'any']).nullable().optional(),
    skill_level: z.enum(['beginner', 'intermediate', 'advanced', 'any']).nullable().optional(),
  }).default({}),

  // === COMPETITIVE LANDSCAPE ===
  competitive: z.object({
    main_alternatives: z.array(z.string()).default([]),
    differentiators: z.array(z.string()).default([]), // What makes it different
    best_for: z.string().nullable().optional(),       // "Best for X because Y"
    not_ideal_for: z.string().nullable().optional(),  // "Not ideal for X because Y"
  }).default({}),

  // === DATA & SECURITY ===
  security: z.object({
    soc2_certified: z.boolean().nullable().optional(),
    gdpr_compliant: z.boolean().nullable().optional(),
    hipaa_compliant: z.boolean().nullable().optional(),
    data_encryption: z.enum(['at-rest', 'in-transit', 'both', 'none', 'unknown']).nullable().optional(),
    sso_available: z.boolean().nullable().optional(),
    two_factor: z.boolean().nullable().optional(),
    self_hosted_option: z.boolean().optional().default(false),
  }).default({}),

  // === SUPPORT ===
  support: z.object({
    has_documentation: z.boolean().optional().default(false),
    has_community: z.boolean().optional().default(false),            // Forum, Discord, etc.
    has_live_chat: z.boolean().optional().default(false),
    has_phone_support: z.boolean().optional().default(false),
    has_dedicated_support: z.boolean().optional().default(false),    // Enterprise tier
  }).default({}),

  // === META ===
  meta: z.object({
    last_major_update: z.string().nullable().optional(), // "2024-01", approximate
    active_development: z.boolean().nullable().optional(),
    user_sentiment: z.enum(['very_positive', 'positive', 'mixed', 'negative', 'very_negative']).nullable().optional(),
    data_quality: z.enum(['high', 'medium', 'low']),  // How confident we are overall
    extraction_date: z.string(),           // ISO date when facts extracted
  }),
});

export type KnowledgeCard = z.infer<typeof KnowledgeCardSchema>;

// =============================================================================
// GEMINI RESPONSE SCHEMA (for structured output)
// =============================================================================

// Simplified version for Gemini (without default values that confuse the model)
export const GeminiKnowledgeCardSchema = {
  type: 'object',
  properties: {
    official_name: { type: 'string' },
    tagline: { type: 'string', nullable: true },
    website_url: { type: 'string', nullable: true },
    logo_url: { type: 'string', nullable: true },
    company: {
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
        founded_year: { type: 'integer', nullable: true },
        headquarters: { type: 'string', nullable: true },
        employee_count: { type: 'string', nullable: true, enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] },
        funding_stage: { type: 'string', nullable: true, enum: ['bootstrapped', 'seed', 'series-a', 'series-b', 'series-c+', 'public', 'acquired'] },
      },
    },
    pricing: {
      type: 'object',
      properties: {
        model: { type: 'string', enum: ['free', 'freemium', 'paid', 'enterprise', 'open_source'] },
        has_free_tier: { type: 'boolean' },
        has_free_trial: { type: 'boolean' },
        trial_days: { type: 'integer', nullable: true },
        starting_price: { type: 'string', nullable: true },
        tiers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'string', nullable: true },
              billing_period: { type: 'string', nullable: true, enum: ['monthly', 'yearly', 'one-time', 'custom'] },
              features: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      required: ['model', 'has_free_tier', 'has_free_trial'],
    },
    platforms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['web', 'mac', 'windows', 'linux', 'ios', 'android', 'cli', 'api', 'self-hosted'] },
          available: { type: 'boolean' },
          notes: { type: 'string', nullable: true },
        },
        required: ['platform', 'available'],
      },
    },
    features: {
      type: 'object',
      properties: {
        core: { type: 'array', items: { type: 'string' } },
        unique: { type: 'array', items: { type: 'string' } },
        capabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['full', 'partial', 'none', 'planned', 'beta'] },
              notes: { type: 'string', nullable: true },
            },
            required: ['name', 'status'],
          },
        },
      },
    },
    integrations: {
      type: 'object',
      properties: {
        total_count: { type: 'integer', nullable: true },
        notable: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['native', 'api', 'zapier', 'webhook', 'plugin'] },
              direction: { type: 'string', enum: ['import', 'export', 'bidirectional'], nullable: true },
            },
            required: ['name', 'type'],
          },
        },
        has_api: { type: 'boolean' },
        has_webhooks: { type: 'boolean' },
        has_zapier: { type: 'boolean' },
      },
    },
    audience: {
      type: 'object',
      properties: {
        primary: { type: 'array', items: { type: 'string' } },
        use_cases: { type: 'array', items: { type: 'string' } },
        team_size: { type: 'string', nullable: true, enum: ['solo', 'small', 'medium', 'enterprise', 'any'] },
        skill_level: { type: 'string', nullable: true, enum: ['beginner', 'intermediate', 'advanced', 'any'] },
      },
    },
    competitive: {
      type: 'object',
      properties: {
        main_alternatives: { type: 'array', items: { type: 'string' } },
        differentiators: { type: 'array', items: { type: 'string' } },
        best_for: { type: 'string', nullable: true },
        not_ideal_for: { type: 'string', nullable: true },
      },
    },
    security: {
      type: 'object',
      properties: {
        soc2_certified: { type: 'boolean', nullable: true },
        gdpr_compliant: { type: 'boolean', nullable: true },
        hipaa_compliant: { type: 'boolean', nullable: true },
        data_encryption: { type: 'string', nullable: true, enum: ['at-rest', 'in-transit', 'both', 'none', 'unknown'] },
        sso_available: { type: 'boolean', nullable: true },
        two_factor: { type: 'boolean', nullable: true },
        self_hosted_option: { type: 'boolean' },
      },
    },
    support: {
      type: 'object',
      properties: {
        has_documentation: { type: 'boolean' },
        has_community: { type: 'boolean' },
        has_live_chat: { type: 'boolean' },
        has_phone_support: { type: 'boolean' },
        has_dedicated_support: { type: 'boolean' },
      },
    },
    meta: {
      type: 'object',
      properties: {
        last_major_update: { type: 'string', nullable: true },
        active_development: { type: 'boolean', nullable: true },
        user_sentiment: { type: 'string', nullable: true, enum: ['very_positive', 'positive', 'mixed', 'negative', 'very_negative'] },
        data_quality: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['data_quality'],
    },
  },
  required: ['official_name', 'pricing', 'meta'],
};

// =============================================================================
// COMPARISON HELPERS
// =============================================================================

/**
 * Extract comparable facts from a Knowledge Card for side-by-side comparison
 */
export function getComparableFacts(card: KnowledgeCard): Record<string, unknown> {
  return {
    // Pricing
    'Pricing Model': card.pricing.model,
    'Free Tier': card.pricing.has_free_tier ? 'Yes' : 'No',
    'Free Trial': card.pricing.has_free_trial ? (card.pricing.trial_days ? `${card.pricing.trial_days} days` : 'Yes') : 'No',
    'Starting Price': card.pricing.starting_price || 'N/A',

    // Platforms
    'Web App': card.platforms.find(p => p.platform === 'web')?.available ? 'Yes' : 'No',
    'Mac App': card.platforms.find(p => p.platform === 'mac')?.available ? 'Yes' : 'No',
    'Windows App': card.platforms.find(p => p.platform === 'windows')?.available ? 'Yes' : 'No',
    'iOS App': card.platforms.find(p => p.platform === 'ios')?.available ? 'Yes' : 'No',
    'Android App': card.platforms.find(p => p.platform === 'android')?.available ? 'Yes' : 'No',
    'API Access': card.integrations.has_api ? 'Yes' : 'No',
    'Self-Hosted': card.security.self_hosted_option ? 'Yes' : 'No',

    // Integrations
    'Zapier': card.integrations.has_zapier ? 'Yes' : 'No',
    'Webhooks': card.integrations.has_webhooks ? 'Yes' : 'No',

    // Security
    'SSO': card.security.sso_available === true ? 'Yes' : card.security.sso_available === false ? 'No' : 'Unknown',
    '2FA': card.security.two_factor === true ? 'Yes' : card.security.two_factor === false ? 'No' : 'Unknown',
    'SOC 2': card.security.soc2_certified === true ? 'Yes' : card.security.soc2_certified === false ? 'No' : 'Unknown',

    // Audience
    'Best For': card.competitive.best_for || card.audience.primary.join(', ') || 'N/A',
    'Team Size': card.audience.team_size || 'Any',

    // Support
    'Documentation': card.support.has_documentation ? 'Yes' : 'No',
    'Community': card.support.has_community ? 'Yes' : 'No',
    'Live Chat': card.support.has_live_chat ? 'Yes' : 'No',
  };
}

/**
 * Find differences between two Knowledge Cards
 */
export function findDifferences(
  cardA: KnowledgeCard,
  cardB: KnowledgeCard
): Array<{ field: string; valueA: unknown; valueB: unknown }> {
  const factsA = getComparableFacts(cardA);
  const factsB = getComparableFacts(cardB);

  const differences: Array<{ field: string; valueA: unknown; valueB: unknown }> = [];

  for (const [field, valueA] of Object.entries(factsA)) {
    const valueB = factsB[field];
    if (valueA !== valueB) {
      differences.push({ field, valueA, valueB });
    }
  }

  return differences;
}
