/**
 * Hunter Schema Library
 *
 * Three-layer schema system:
 * 1. BaseToolSchema (Universal) - Always extracted
 * 2. Category Schemas (Layer 2) - Based on broad category
 * 3. Specialized Schemas (Layer 3) - For sub-categories
 *
 * 18 categories + 20 specializations covering all major B2B SaaS verticals.
 */

// ============================================================================
// LAYER 1: Universal Baseline
// ============================================================================
export {
  BaseToolSchema,
  type BaseToolData,
} from './category-schemas';

// ============================================================================
// LAYER 2: Category Schemas (18 categories)
// ============================================================================
export {
  InfrastructureSchema,      // A: Databases, serverless
  EnterpriseSaaSSchema,      // B: Salesforce, Workday
  ProductivitySchema,        // C: Notion, Obsidian
  DevToolsSchema,            // D: GitHub, Postman
  DesignMarketingSchema,     // E: Figma, Semrush
  CRMSalesSchema,            // F: HubSpot, Pipedrive
  CustomerSupportSchema,     // G: Intercom, Zendesk
  HRRecruitingSchema,        // H: Deel, Rippling
  FinanceSchema,             // I: QuickBooks, Xero
  SecurityIdentitySchema,    // J: 1Password, Okta
  CommunicationSchema,       // K: Slack, Zoom
  EcommercePaymentsSchema,   // L: Stripe, Shopify
  AIAutomationSchema,        // M: OpenAI, Zapier
  AnalyticsBISchema,         // N: Mixpanel, Amplitude
  CMSWebsiteSchema,          // O: WordPress, Webflow
  NoCodeLowCodeSchema,       // P: Bubble, Retool
  FileStorageSchema,         // Q: Dropbox, Box
  SchedulingSchema,          // R: Calendly, Cal.com

  CategorySchemaMap,
  type CategorySlug,
  getSchemaForCategory,
  getCategorySpecificFields,
  getExtractionPrompt,
  getEstimatedCost,
  CategoryExtractionCost,
} from './category-schemas';

// ============================================================================
// LAYER 3: Specialized Schemas (20+ specializations)
// ============================================================================
export {
  // Dev Tools specializations
  CICDSchema,
  MonitoringSchema,
  APIDevSchema,
  VersionControlSchema,

  // CRM specializations
  SalesCRMSchema,
  MarketingCRMSchema,

  // Productivity specializations
  NoteTakingSchema,
  ProjectManagementSchema,
  DocumentationSchema,

  // Communication specializations
  TeamChatSchema,
  VideoConferencingSchema,

  // Analytics specializations
  ProductAnalyticsSchema,
  WebAnalyticsSchema,

  // eCommerce specializations
  PaymentProcessingSchema,
  EcommercePlatformSchema,

  // Mapping and utilities
  SpecializedSchemaMap,
  type SpecializedSlug,
  getSpecializedSchema,
  hasSpecializedSchema,
} from './specialized-schemas';

// ============================================================================
// UNIFIED SCHEMA RESOLVER
// ============================================================================

import { z } from 'zod';
import { BaseToolSchema, getSchemaForCategory } from './category-schemas';
import { getSpecializedSchema, hasSpecializedSchema } from './specialized-schemas';

// ============================================================================
// CATEGORY REGISTRY (Single Source of Truth)
// ============================================================================
export {
  CategoryRegistry,
  type CategoryDefinition,
  type PersonaTag,
  getCategoryDefinition,
  getChildCategories,
  getCategoryHierarchy,
  getTopLevelCategories,
  getCategoriesForPersona,
  getTotalExtractionCost,
  getSchemaNames,
} from './category-registry';

/**
 * Resolves the complete schema for a tool based on its categories.
 *
 * Merges schemas in order: Base → Category → Specialized
 *
 * @param categorySlug - The main category (e.g., 'developer-tools')
 * @param subCategorySlug - Optional sub-category (e.g., 'ci-cd')
 * @returns Combined Zod schema with all relevant fields
 *
 * @example
 * // Just category
 * const schema = resolveFullSchema('developer-tools');
 *
 * // Category + specialization
 * const schema = resolveFullSchema('developer-tools', 'ci-cd');
 */
export function resolveFullSchema(
  categorySlug: string,
  subCategorySlug?: string
): z.ZodObject<any> {
  // Start with base (Layer 1)
  let schema = BaseToolSchema;

  // Add category schema (Layer 2)
  const categorySchema = getSchemaForCategory(categorySlug);
  if (categorySchema !== BaseToolSchema) {
    schema = schema.merge(categorySchema);
  }

  // Add specialized schema (Layer 3) if available
  if (subCategorySlug && hasSpecializedSchema(subCategorySlug)) {
    const specialized = getSpecializedSchema(subCategorySlug);
    if (specialized) {
      schema = schema.merge(specialized);
    }
  }

  return schema;
}

/**
 * Get extraction prompt for all applicable layers.
 *
 * @example
 * const prompt = getFullExtractionPrompt('developer-tools', 'ci-cd');
 * // Returns instructions for DevTools fields + CI/CD-specific fields
 */
export function getFullExtractionPrompt(
  categorySlug: string,
  subCategorySlug?: string
): string {
  const schema = resolveFullSchema(categorySlug, subCategorySlug);
  const fields = Object.entries(schema.shape)
    .filter(([key]) => key !== 'name') // Skip obvious fields
    .map(([key, fieldSchema]) => {
      // @ts-ignore - accessing Zod internals
      const desc = fieldSchema._def?.description || '';
      return `- ${key}${desc ? `: ${desc}` : ''}`;
    });

  const categoryName = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const subName = subCategorySlug
    ? ` (${subCategorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())})`
    : '';

  return `You are analyzing a ${categoryName}${subName} tool.

Extract the following fields:
${fields.join('\n')}

Rules:
- If a field cannot be determined from public sources, return null
- Do NOT hallucinate or guess values
- Prefer official sources (pricing pages, docs) over third-party reviews
- For boolean fields, only return true if explicitly confirmed`;
}
