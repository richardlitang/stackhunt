/**
 * Gemini Service - Google AI wrapper
 *
 * Handles text generation and embeddings via Google's Gemini API.
 * Refactored for maintainability:
 * - Prompts extracted to separate files
 * - URL sanitization via utility
 * - Actual token counts from API response
 *
 * @module hunter/services/gemini
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  KnowledgeCardSchema,
  GeminiKnowledgeCardSchema,
  type KnowledgeCard,
} from '../../knowledge-card';
import { AnalysisSchema, type HunterAnalysis } from '../types';
import { classifyGeminiError } from '../errors';
import { geminiCircuit } from './circuit-breaker';
import { buildExtractionPrompt } from '../prompts/extraction';
import { sanitizeUrl } from '../../utils/url';
import { getGeminiModelForStage } from './model-router';
import { generateContentWithThinkingFallback } from './gemini-compat';

export interface GeminiConfig {
  apiKey: string;
}

export interface ExtractKnowledgeCardInput {
  toolName: string;
  contextTitle?: string; // Context for audience-aware extraction (e.g., "Google Ads alternatives")
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  companySnippets: string[]; // Company info, funding, history
  technicalSnippets: string[]; // API, export, integrations
  corporateProfilerSnippets?: string[]; // V4: Crunchbase, LinkedIn, stock ticker (prevents employee hallucination)
  pricingDeepContent?: string; // Full page content from pricing pages (via Jina.ai)
}

export interface SynthesizeInput {
  toolName: string;
  contextTitle?: string;
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  // V3.1: Tribal Knowledge Snippets
  budgetAnalystSnippets: string[]; // Hidden costs, billing logic, implementation fees
  tribalKnowledgeSnippets: string[]; // Reddit reviews, honest feedback, power tips
  // V6: Deep tribal content (full discussions, not snippets)
  tribalDeepContent?: string; // Full Reddit/HN threads for authentic insights
  knowledgeCardFacts: string;
  existingCategories: {
    functions: string[];
    audiences: string[];
    platforms: string[];
  };
  promptTemplate: string;
}

export class GeminiService {
  private client: GoogleGenAI;
  private apiKey: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
  }

  private parseJsonResponse(content: string): any {
    const cleaned = content
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const extractedObject =
      firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    const extractedArray =
      firstBracket >= 0 && lastBracket > firstBracket
        ? cleaned.slice(firstBracket, lastBracket + 1)
        : cleaned;

    const candidates = [content, cleaned, extractedObject, extractedArray];
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to parse JSON response');
  }

  /**
   * Extract structured facts (Pass 1 - The Librarian + Forensic Accountant)
   */
  async extractKnowledgeCard(
    input: ExtractKnowledgeCardInput,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>,
    options?: { mode?: 'full' | 'pricing_only' }
  ): Promise<{ knowledgeCard: KnowledgeCard; tokensUsed: number }> {
    const model = getGeminiModelForStage('research_extraction');
    const toolSlug = input.toolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Build prompt from extracted template (see prompts/extraction.ts)
    const prompt = buildExtractionPrompt({
      toolName: input.toolName,
      toolSlug,
      contextTitle: input.contextTitle,
      reviewsSnippets: input.reviewsSnippets,
      pricingSnippets: input.pricingSnippets,
      alternativesSnippets: input.alternativesSnippets,
      companySnippets: input.companySnippets,
      technicalSnippets: input.technicalSnippets,
      corporateProfilerSnippets: input.corporateProfilerSnippets,
      pricingDeepContent: input.pricingDeepContent,
    });

    const generateFn = async () => {
      return geminiCircuit.execute(async () => {
        try {
          return await generateContentWithThinkingFallback(this.client, {
            model,
            contents: prompt,
            config: {
              temperature: 0.1, // Low temperature for fact extraction
              responseMimeType: 'application/json',
              responseSchema: GeminiKnowledgeCardSchema,
              thinkingConfig: {
                thinkingLevel:
                  options?.mode === 'pricing_only' ? ThinkingLevel.LOW : ThinkingLevel.HIGH, // Deep reasoning for comprehensive extraction
              },
            },
          });
        } catch (error) {
          throw classifyGeminiError(error);
        }
      });
    };
    const response = withRetry
      ? await withRetry(generateFn, 'Gemini fact extraction')
      : await generateFn();

    const content = response.text;
    if (!content) throw new Error('Empty response from Gemini fact extraction');

    const rawParsed = this.parseJsonResponse(content);
    const parsed = Array.isArray(rawParsed) ? rawParsed[0] || {} : rawParsed;

    // Optional object blocks may come back as explicit null; drop them before schema parse.
    const optionalObjectKeys = [
      'setup_complexity',
      'smp_pricing',
      'smp_taxonomy',
      'smp_portability',
      'constraints',
      'review_context',
    ] as const;
    for (const key of optionalObjectKeys) {
      if (parsed[key] === null) {
        delete parsed[key];
      }
    }

    // Compatibility normalization when SDK-side schema enforcement is unavailable.
    // Keeps extraction resilient while preserving strict validation below.
    parsed.official_name = typeof parsed.official_name === 'string' ? parsed.official_name : input.toolName;
    parsed.pricing = typeof parsed.pricing === 'object' && parsed.pricing !== null ? parsed.pricing : {};
    const allowedPricingModels = new Set(['free', 'freemium', 'paid', 'enterprise', 'open_source']);
    parsed.pricing.model = allowedPricingModels.has(parsed.pricing.model) ? parsed.pricing.model : 'paid';
    parsed.pricing.has_free_tier = typeof parsed.pricing.has_free_tier === 'boolean'
      ? parsed.pricing.has_free_tier
      : false;
    parsed.pricing.has_free_trial = typeof parsed.pricing.has_free_trial === 'boolean'
      ? parsed.pricing.has_free_trial
      : false;
    parsed.features = typeof parsed.features === 'object' && parsed.features !== null ? parsed.features : {};
    parsed.features.core = Array.isArray(parsed.features.core) ? parsed.features.core : [];
    parsed.features.unique = Array.isArray(parsed.features.unique) ? parsed.features.unique : [];
    parsed.platforms = Array.isArray(parsed.platforms) ? parsed.platforms : [];
    parsed.audience = typeof parsed.audience === 'object' && parsed.audience !== null ? parsed.audience : {};
    parsed.audience.primary = Array.isArray(parsed.audience.primary) ? parsed.audience.primary : [];
    parsed.audience.secondary = Array.isArray(parsed.audience.secondary) ? parsed.audience.secondary : [];
    parsed.audience.use_cases = Array.isArray(parsed.audience.use_cases)
      ? parsed.audience.use_cases
      : [];
    parsed.integrations =
      typeof parsed.integrations === 'object' && parsed.integrations !== null ? parsed.integrations : {};
    parsed.integrations.notable = Array.isArray(parsed.integrations.notable)
      ? parsed.integrations.notable
      : [];
    parsed.competitive =
      typeof parsed.competitive === 'object' && parsed.competitive !== null ? parsed.competitive : {};
    parsed.competitive.main_alternatives = Array.isArray(parsed.competitive.main_alternatives)
      ? parsed.competitive.main_alternatives
      : [];
    parsed.smp_taxonomy =
      typeof parsed.smp_taxonomy === 'object' && parsed.smp_taxonomy !== null
        ? parsed.smp_taxonomy
        : {};
    parsed.smp_taxonomy.primary_function =
      typeof parsed.smp_taxonomy.primary_function === 'string' &&
      parsed.smp_taxonomy.primary_function.trim()
        ? parsed.smp_taxonomy.primary_function
        : 'Software Tool';
    parsed.smp_taxonomy.secondary_functions = Array.isArray(parsed.smp_taxonomy.secondary_functions)
      ? parsed.smp_taxonomy.secondary_functions
      : [];
    parsed.smp_taxonomy.likely_departments = Array.isArray(parsed.smp_taxonomy.likely_departments)
      ? parsed.smp_taxonomy.likely_departments
      : [];

    if (parsed.platforms && !Array.isArray(parsed.platforms) && typeof parsed.platforms === 'object') {
      const platformMap: Record<string, string> = {
        web: 'web',
        website: 'web',
        mac: 'mac',
        windows: 'windows',
        win: 'windows',
        linux: 'linux',
        ios: 'ios',
        android: 'android',
        cli: 'cli',
        api: 'api',
        self_hosted: 'self-hosted',
        'self-hosted': 'self-hosted',
      };
      parsed.platforms = Object.entries(parsed.platforms)
        .map(([rawKey, value]) => {
          const normalized = platformMap[rawKey.toLowerCase()];
          if (!normalized) return null;
          const available =
            typeof value === 'boolean'
              ? value
              : typeof value === 'object' && value !== null && 'available' in value
                ? Boolean((value as { available?: unknown }).available)
                : Boolean(value);
          return { platform: normalized, available };
        })
        .filter(Boolean);
    }
    if (Array.isArray(parsed.platforms) && parsed.platforms.some((p: unknown) => typeof p === 'string')) {
      const platformMap: Record<string, string> = {
        web: 'web',
        website: 'web',
        mac: 'mac',
        windows: 'windows',
        win: 'windows',
        linux: 'linux',
        ios: 'ios',
        android: 'android',
        cli: 'cli',
        api: 'api',
        self_hosted: 'self-hosted',
        'self-hosted': 'self-hosted',
      };
      parsed.platforms = parsed.platforms
        .map((entry: unknown) => {
          if (typeof entry === 'string') {
            const normalized = platformMap[entry.toLowerCase()];
            if (!normalized) return null;
            return { platform: normalized, available: true };
          }
          if (entry && typeof entry === 'object') return entry;
          return null;
        })
        .filter(Boolean);
    }

    if (parsed.setup_complexity?.steps && Array.isArray(parsed.setup_complexity.steps)) {
      parsed.setup_complexity.steps = parsed.setup_complexity.steps.map((step: any) => ({
        ...step,
        command: step?.command ?? undefined,
      }));
    }
    if (parsed.setup_complexity && typeof parsed.setup_complexity === 'object') {
      parsed.setup_complexity.requires_developer =
        typeof parsed.setup_complexity.requires_developer === 'boolean'
          ? parsed.setup_complexity.requires_developer
          : false;
      parsed.setup_complexity.requires_it_admin =
        typeof parsed.setup_complexity.requires_it_admin === 'boolean'
          ? parsed.setup_complexity.requires_it_admin
          : false;
      parsed.setup_complexity.implementation_partner_needed =
        typeof parsed.setup_complexity.implementation_partner_needed === 'boolean'
          ? parsed.setup_complexity.implementation_partner_needed
          : false;
      parsed.setup_complexity.estimated_setup_time = [
        'minutes',
        'hours',
        'days',
        'weeks',
      ].includes(parsed.setup_complexity.estimated_setup_time)
        ? parsed.setup_complexity.estimated_setup_time
        : 'hours';
      parsed.setup_complexity.setup_type = ['cli', 'web', 'installer', 'hybrid', 'api_only'].includes(
        parsed.setup_complexity.setup_type
      )
        ? parsed.setup_complexity.setup_type
        : 'web';
      parsed.setup_complexity.friction_score =
        typeof parsed.setup_complexity.friction_score === 'number'
          ? parsed.setup_complexity.friction_score
          : 3;
      parsed.setup_complexity.aha_moment =
        typeof parsed.setup_complexity.aha_moment === 'string'
          ? parsed.setup_complexity.aha_moment
          : undefined;
      parsed.setup_complexity.setup_url =
        typeof parsed.setup_complexity.setup_url === 'string'
          ? parsed.setup_complexity.setup_url
          : parsed.website_url || undefined;
      const redTape =
        typeof parsed.setup_complexity.red_tape === 'object' &&
        parsed.setup_complexity.red_tape !== null
          ? parsed.setup_complexity.red_tape
          : {};
      parsed.setup_complexity.red_tape = {
        cc_required: Boolean((redTape as any).cc_required),
        domain_required: Boolean((redTape as any).domain_required),
        admin_required: Boolean((redTape as any).admin_required),
        sales_gated: Boolean((redTape as any).sales_gated),
        approval_required: Boolean((redTape as any).approval_required),
      };
    }

    if (parsed.integrations && typeof parsed.integrations === 'object') {
      const integrations = parsed.integrations as any;
      integrations.has_api = Boolean(integrations.has_api);
      integrations.has_webhooks = Boolean(integrations.has_webhooks);
      integrations.has_zapier = Boolean(integrations.has_zapier);
    }

    if (parsed.company && typeof parsed.company === 'object') {
      const company = parsed.company as any;
      if (typeof company.employee_count === 'number' && Number.isFinite(company.employee_count)) {
        const n = company.employee_count;
        if (n <= 10) company.employee_count = '1-10';
        else if (n <= 50) company.employee_count = '11-50';
        else if (n <= 200) company.employee_count = '51-200';
        else if (n <= 500) company.employee_count = '201-500';
        else if (n <= 1000) company.employee_count = '501-1000';
        else company.employee_count = '1000+';
      } else if (typeof company.employee_count === 'string') {
        const raw = company.employee_count.trim().toLowerCase();
        const directMap: Record<string, string> = {
          '1-10': '1-10',
          '11-50': '11-50',
          '51-200': '51-200',
          '201-500': '201-500',
          '501-1000': '501-1000',
          '1000+': '1000+',
          '101-200': '51-200',
          '50-200': '51-200',
          '200-500': '201-500',
          '500-1000': '501-1000',
          '1001+': '1000+',
        };
        company.employee_count = directMap[raw] ?? null;
      }
    }

    if (parsed.constraints?.hidden_costs && Array.isArray(parsed.constraints.hidden_costs)) {
      parsed.constraints.hidden_costs = parsed.constraints.hidden_costs.map((cost: any) => {
        const normalizedCost =
          typeof cost?.cost === 'number' && Number.isFinite(cost.cost)
            ? cost.cost
            : typeof cost?.cost === 'string'
              ? (() => {
                  const cleaned = cost.cost.replace(/[^0-9.\-]/g, '');
                  const parsedValue = Number.parseFloat(cleaned);
                  return Number.isFinite(parsedValue) ? parsedValue : null;
                })()
              : null;
        const normalizedUrl =
          typeof cost?.source_url === 'string' && cost.source_url.trim()
            ? sanitizeUrl(cost.source_url)
            : null;
        return {
          ...cost,
          cost: normalizedCost,
          description:
            typeof cost?.description === 'string' && cost.description.trim()
              ? cost.description
              : 'Additional cost may apply',
          trigger:
            typeof cost?.trigger === 'string' && cost.trigger.trim() ? cost.trigger : 'Usage over limit',
          currency: typeof cost?.currency === 'string' && cost.currency.trim() ? cost.currency : 'USD',
          source_url: normalizedUrl || undefined,
        };
      });
    }

    if (parsed.constraints && typeof parsed.constraints === 'object') {
      parsed.constraints.hard_limits = Array.isArray(parsed.constraints.hard_limits)
        ? parsed.constraints.hard_limits
        : [];
      parsed.constraints.hidden_costs = Array.isArray(parsed.constraints.hidden_costs)
        ? parsed.constraints.hidden_costs
        : [];
    }

    if (parsed.constraints?.hard_limits && Array.isArray(parsed.constraints.hard_limits)) {
      const allowedConstraintTypes = new Set([
        'record_count',
        'storage_gb',
        'api_requests_per_month',
        'api_rate_limit_per_sec',
        'seat_count',
        'project_count',
        'active_contacts',
        'message_credits',
      ]);
      const allowedConsequenceTypes = new Set([
        'hard_stop',
        'soft_throttle',
        'auto_charge',
        'upgrade_locked',
        'data_deletion',
      ]);
      parsed.constraints.hard_limits = parsed.constraints.hard_limits
        .map((limit: any) => {
          const normalizedUrl =
            typeof limit?.source_url === 'string' && limit.source_url.trim()
              ? sanitizeUrl(limit.source_url)
              : null;
          return {
            ...limit,
            description:
              typeof limit?.description === 'string' && limit.description.trim()
                ? limit.description
                : 'Usage limit applies',
            source_url: normalizedUrl || undefined,
            overage:
              limit?.overage &&
              typeof limit.overage === 'object' &&
              typeof limit.overage.cost === 'number' &&
              Number.isFinite(limit.overage.cost) &&
              typeof limit.overage.unit === 'string' &&
              limit.overage.unit.trim()
                ? {
                    cost: limit.overage.cost,
                    unit: limit.overage.unit.trim(),
                    currency:
                      typeof limit.overage.currency === 'string' && limit.overage.currency.trim()
                        ? limit.overage.currency.trim().toUpperCase()
                        : 'USD',
                  }
                : undefined,
          };
        })
        .filter(
          (limit: any) =>
            typeof limit?.value === 'number' &&
            allowedConstraintTypes.has(limit?.type) &&
            allowedConsequenceTypes.has(limit?.consequence)
        );
    }

    if (parsed.smp_portability && typeof parsed.smp_portability === 'object') {
      parsed.smp_portability.has_data_export =
        typeof parsed.smp_portability.has_data_export === 'boolean'
          ? parsed.smp_portability.has_data_export
          : false;
      parsed.smp_portability.has_api_export =
        typeof parsed.smp_portability.has_api_export === 'boolean'
          ? parsed.smp_portability.has_api_export
          : false;
      parsed.smp_portability.export_formats = Array.isArray(parsed.smp_portability.export_formats)
        ? parsed.smp_portability.export_formats
        : [];
      parsed.smp_portability.import_from = Array.isArray(parsed.smp_portability.import_from)
        ? parsed.smp_portability.import_from
        : [];
      parsed.smp_portability.export_to = Array.isArray(parsed.smp_portability.export_to)
        ? parsed.smp_portability.export_to
        : [];
      if (typeof parsed.smp_portability.migration_difficulty === 'string') {
        const raw = parsed.smp_portability.migration_difficulty.trim().toLowerCase();
        const allowed = new Set(['trivial', 'easy', 'moderate', 'hard', 'locked']);
        parsed.smp_portability.migration_difficulty = allowed.has(raw)
          ? raw
          : raw === 'not applicable' || raw === 'n/a'
            ? null
            : null;
      }
    }

    if (parsed.smp_pricing && typeof parsed.smp_pricing === 'object') {
      const smp = parsed.smp_pricing as any;
      if (!smp.model) {
        delete parsed.smp_pricing;
      } else if (Array.isArray(smp.plans)) {
        smp.annual_discount_pct =
          typeof smp.annual_discount_pct === 'number' ? smp.annual_discount_pct : null;
        smp.min_seats = typeof smp.min_seats === 'number' ? smp.min_seats : null;
        smp.bundled_in = typeof smp.bundled_in === 'string' ? smp.bundled_in : null;

        const toolSlugForPlan = input.toolName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        smp.plans = smp.plans
          .map((plan: any, index: number) => {
            const normalizedName =
              typeof plan?.name === 'string' && plan.name.trim() ? plan.name : `Plan ${index + 1}`;
            const normalized = {
              ...plan,
              name: normalizedName,
              id:
                typeof plan?.id === 'string' && plan.id.trim()
                  ? plan.id
                  : `${toolSlugForPlan}-${String(normalizedName || `plan-${index + 1}`)
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')}`,
              price_monthly: typeof plan?.price_monthly === 'number' ? plan.price_monthly : null,
              price_annual: typeof plan?.price_annual === 'number' ? plan.price_annual : null,
              price_per_unit: typeof plan?.price_per_unit === 'number' ? plan.price_per_unit : null,
              included_units: typeof plan?.included_units === 'number' ? plan.included_units : null,
              max_users: typeof plan?.max_users === 'number' ? plan.max_users : null,
              max_storage_gb: typeof plan?.max_storage_gb === 'number' ? plan.max_storage_gb : null,
              max_projects: typeof plan?.max_projects === 'number' ? plan.max_projects : null,
              variable_price: typeof plan?.variable_price === 'number' ? plan.variable_price : null,
            };

            const hasNumericPrice =
              normalized.price_monthly !== null ||
              normalized.price_annual !== null ||
              normalized.price_per_unit !== null ||
              normalized.variable_price !== null;

            if (!normalized.is_enterprise && !hasNumericPrice) {
              return null;
            }

            return normalized;
          })
          .filter(Boolean);

        if (smp.plans.length === 0) {
          delete parsed.smp_pricing;
        }
      }
    }

    const toStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim());
      }
      if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
      }
      return [];
    };

    if (parsed.review_context && typeof parsed.review_context === 'object') {
      const rc = parsed.review_context as Record<string, any>;
      const budget =
        rc.budget_analyst && typeof rc.budget_analyst === 'object' ? rc.budget_analyst : {};
      const user = rc.user_advocate && typeof rc.user_advocate === 'object' ? rc.user_advocate : {};

      rc.human_verdict =
        typeof rc.human_verdict === 'string' ? rc.human_verdict : rc.human_verdict ?? null;
      rc.budget_analyst = {
        ...budget,
        cost_drivers: toStringArray(budget.cost_drivers),
        one_time_fees: toStringArray(budget.one_time_fees),
        commitment_terms:
          typeof budget.commitment_terms === 'string' ? budget.commitment_terms : null,
        roi_threshold: typeof budget.roi_threshold === 'string' ? budget.roi_threshold : null,
      };
      rc.user_advocate = {
        ...user,
        ideal_for: toStringArray(user.ideal_for),
        avoid_if: toStringArray(user.avoid_if),
        delighters: toStringArray(user.delighters),
        frustrations: toStringArray(user.frustrations),
        vibe: typeof user.vibe === 'string' ? user.vibe : null,
        origin_story: typeof user.origin_story === 'string' ? user.origin_story : null,
        power_tip: typeof user.power_tip === 'string' ? user.power_tip : null,
      };
    }

    const commitmentTerms = parsed.review_context?.budget_analyst?.commitment_terms;
    if (Array.isArray(commitmentTerms)) {
      parsed.review_context.budget_analyst.commitment_terms = commitmentTerms
        .filter((term) => typeof term === 'string' && term.trim())
        .join('; ');
    }

    // Add extraction date
    parsed.meta = {
      ...parsed.meta,
      data_quality:
        parsed?.meta?.data_quality === 'high' ||
        parsed?.meta?.data_quality === 'medium' ||
        parsed?.meta?.data_quality === 'low'
          ? parsed.meta.data_quality
          : 'medium',
      extraction_date: new Date().toISOString().split('T')[0],
    };

    // Sanitize URLs using utility (handles missing protocol, invalid formats)
    parsed.website_url = sanitizeUrl(parsed.website_url);
    parsed.logo_url = sanitizeUrl(parsed.logo_url);

    // Normalize funding stage to supported enum values before schema validation.
    const normalizeFundingStage = (value: unknown): string | null | undefined => {
      if (value == null) return value as null | undefined;
      if (typeof value !== 'string') return undefined;
      const normalized = value.trim().toLowerCase();
      const allowed = new Set([
        'bootstrapped',
        'seed',
        'series-a',
        'series-b',
        'series-c+',
        'public',
        'acquired',
      ]);
      if (allowed.has(normalized)) return normalized;
      if (normalized === 'private') return 'series-c+';
      return undefined;
    };
    if (parsed.company && typeof parsed.company === 'object') {
      parsed.company.funding_stage = normalizeFundingStage(parsed.company.funding_stage);
    }

    // Validate with Zod
    const validated = KnowledgeCardSchema.parse(parsed);

    // Use actual token count from API response, fallback to heuristic
    const tokensUsed =
      response.usageMetadata?.totalTokenCount ?? Math.ceil((prompt.length + content.length) / 4);

    return { knowledgeCard: validated, tokensUsed };
  }

  /**
   * Synthesize analysis with contextual review (Pass 2 - The Architect)
   */
  async synthesize(
    input: SynthesizeInput,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<{ analysis: HunterAnalysis; tokensUsed: number }> {
    const model = getGeminiModelForStage('analysis_synthesis');
    // Prompt should already be interpolated with variables
    const prompt = input.promptTemplate;

    const generateFn = async () => {
      return geminiCircuit.execute(async () => {
        try {
          return await generateContentWithThinkingFallback(this.client, {
            model,
            contents: prompt,
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.HIGH, // Deep reasoning for synthesis
              },
            },
          });
        } catch (error) {
          throw classifyGeminiError(error);
        }
      });
    };
    const response = withRetry
      ? await withRetry(generateFn, 'Gemini synthesis')
      : await generateFn();

    const content = response.text;
    if (!content) throw new Error('Empty response from Gemini');

    const rawParsed = this.parseJsonResponse(content);
    const parsed = Array.isArray(rawParsed) ? rawParsed[0] || {} : rawParsed;

    // Fix common AI mistakes: source_type and claim_type confusion
    // AI sometimes puts "fact"/"opinion" in source_type instead of claim_type
    const validSourceTypes = ['official', 'editorial', 'community'];
    const fixClaim = (claim: unknown) => {
      if (typeof claim === 'object' && claim !== null) {
        const c = claim as Record<string, unknown>;
        // If source_type has a claim_type value, swap them
        if (c.source_type && !validSourceTypes.includes(c.source_type as string)) {
          // source_type has invalid value - check if it looks like a claim_type
          if (c.source_type === 'fact' || c.source_type === 'opinion') {
            // Move the value to claim_type if claim_type is missing
            if (!c.claim_type) {
              c.claim_type = c.source_type;
            }
            // Default source_type to 'editorial' (safe middle ground)
            c.source_type = 'editorial';
          }
        }
      }
      return claim;
    };
    if (Array.isArray(parsed.pros)) {
      parsed.pros = parsed.pros.map(fixClaim);
    }
    if (Array.isArray(parsed.cons)) {
      parsed.cons = parsed.cons.map(fixClaim);
    }

    if (Array.isArray(parsed.faqs)) {
      parsed.faqs = parsed.faqs.map((faq: any) => {
        if (typeof faq?.answer === 'string') {
          faq.answer = faq.answer.trim();
          if (faq.answer.endsWith('...')) {
            faq.answer = faq.answer.replace(/\.\.\.$/, '.').trim();
          }
        }
        return faq;
      });
    }

    // Normalize legacy/snake_case review context payloads to AnalysisSchema shape
    const toStringArray = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim());
      }
      if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
      }
      return [];
    };

    const rawReviewContext = (parsed.reviewContext || parsed.review_context) as Record<string, any> | undefined;
    if (rawReviewContext && typeof rawReviewContext === 'object') {
      const rawBudget = (rawReviewContext.budgetAnalyst || rawReviewContext.budget_analyst || {}) as Record<
        string,
        unknown
      >;
      const rawUser = (rawReviewContext.userAdvocate || rawReviewContext.user_advocate || {}) as Record<
        string,
        unknown
      >;

      parsed.reviewContext = {
        humanVerdict:
          typeof rawReviewContext.humanVerdict === 'string'
            ? rawReviewContext.humanVerdict
            : typeof rawReviewContext.human_verdict === 'string'
              ? rawReviewContext.human_verdict
              : null,
        budgetAnalyst: {
          costDrivers: toStringArray(rawBudget.costDrivers || rawBudget.cost_drivers),
          oneTimeFees: toStringArray(rawBudget.oneTimeFees || rawBudget.one_time_fees),
          commitmentTerms:
            typeof rawBudget.commitmentTerms === 'string'
              ? rawBudget.commitmentTerms
              : typeof rawBudget.commitment_terms === 'string'
                ? rawBudget.commitment_terms
                : null,
          roiThreshold:
            typeof rawBudget.roiThreshold === 'string'
              ? rawBudget.roiThreshold
              : typeof rawBudget.roi_threshold === 'string'
                ? rawBudget.roi_threshold
                : null,
        },
        userAdvocate: {
          vibe: typeof rawUser.vibe === 'string' ? rawUser.vibe : null,
          originStory:
            typeof rawUser.originStory === 'string'
              ? rawUser.originStory
              : typeof rawUser.origin_story === 'string'
                ? rawUser.origin_story
                : null,
          idealFor: toStringArray(rawUser.idealFor || rawUser.ideal_for),
          avoidIf: toStringArray(rawUser.avoidIf || rawUser.avoid_if),
          powerTip:
            typeof rawUser.powerTip === 'string'
              ? rawUser.powerTip
              : typeof rawUser.power_tip === 'string'
                ? rawUser.power_tip
                : null,
          delighters: toStringArray(rawUser.delighters),
          frustrations: toStringArray(rawUser.frustrations),
        },
      };
    }
    delete parsed.review_context;

    // Fix verdict: truncate if too long (max 200 chars)
    if (parsed.verdict && typeof parsed.verdict === 'string' && parsed.verdict.length > 200) {
      parsed.verdict = parsed.verdict.slice(0, 197) + '...';
    }

    // Fix shortDescription: truncate if too long (max 200 chars)
    if (
      parsed.shortDescription &&
      typeof parsed.shortDescription === 'string' &&
      parsed.shortDescription.length > 200
    ) {
      parsed.shortDescription = parsed.shortDescription.slice(0, 197) + '...';
    }

    // Sanitize websiteUrl using utility (handles missing protocol, invalid formats)
    const sanitizedUrl = sanitizeUrl(parsed.websiteUrl);
    if (sanitizedUrl) {
      parsed.websiteUrl = sanitizedUrl;
    } else {
      delete parsed.websiteUrl;
    }

    const validated = AnalysisSchema.parse(parsed);

    // Use actual token count from API response, fallback to heuristic
    const tokensUsed =
      response.usageMetadata?.totalTokenCount ?? Math.ceil((prompt.length + content.length) / 4);

    return {
      analysis: validated as unknown as HunterAnalysis,
      tokensUsed,
    };
  }

  /**
   * Generate text embeddings for semantic search
   */
  async generateEmbedding(
    text: string,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<number[]> {
    const targetDimensions = 768;
    const embedFn = async () => {
      return geminiCircuit.execute(async () => {
        try {
          return await this.client.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text,
            config: { outputDimensionality: targetDimensions },
          } as any);
        } catch (error) {
          throw classifyGeminiError(error);
        }
      });
    };
    const response = withRetry ? await withRetry(embedFn, 'Gemini embedding') : await embedFn();

    const rawValues = response.embeddings?.[0]?.values ?? [];
    const values =
      rawValues.length === targetDimensions
        ? rawValues
        : rawValues.length > targetDimensions
          ? rawValues.slice(0, targetDimensions)
          : rawValues;

    if (values.length === targetDimensions) {
      const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
      return norm > 0 ? values.map((v) => v / norm) : values;
    }

    return values;
  }
}
