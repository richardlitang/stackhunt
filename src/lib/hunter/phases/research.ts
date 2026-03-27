/**
 * Research Phase - Scout + Extract Knowledge Card
 *
 * Phase 1 of the Hunter pipeline:
 * 1. Scout for tool information via Serper searches
 * 2. Extract structured facts (Knowledge Card) via Gemini
 * 3. Check for duplicate tools (early exit optimization)
 *
 * @module hunter/phases/research
 */

import type { KnowledgeCard } from '../../knowledge-card';
import type { HunterContext, HunterDependencies, ResearchOutput } from '../types';
import { detectDefunctTool, extractSearchSnippets } from '../services/defunct-detector.js';
import { resolveDetectedCategory } from '../category-resolver.js';
import { buildSnippetBucketsFromScout } from '../utils.js';

/**
 * Execute the Research Phase
 *
 * Performs web research and fact extraction for a tool.
 * Sets isDuplicate flag if tool already exists in database.
 *
 * @param ctx - Hunter context with tool information
 * @param deps - Injected dependencies (services, DB, etc.)
 * @returns Research output with scout results and knowledge card
 */
export async function executeResearchPhase(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<ResearchOutput> {
  deps.log(`[Phase 1: Research] Starting for: ${ctx.toolName}`);
  if (ctx.entityScope) deps.log(`[Scope] Entity scope: ${ctx.entityScope}`);

  // If we have a Research Dossier from the Classifier, use its normalized name
  const toolName = ctx.researchDossier?.normalized_tool_name || ctx.toolName;

  // Log dossier usage for cost tracking
  if (ctx.researchDossier) {
    deps.log(
      `[Dossier] Using pre-generated queries (${ctx.researchDossier.scout_queries.length} queries)`
    );
    deps.log(
      `[Dossier] Category: ${ctx.researchDossier.primary_category} | Confidence: ${ctx.researchDossier.confidence}`
    );
    if (ctx.researchDossier.red_flags?.length) {
      deps.log(`[Dossier] 🚩 Red flags: ${ctx.researchDossier.red_flags.join('; ')}`);
    }
  }

  // Step 1: Scout for information (use dossier queries if available)
  const scoutResult =
    ctx.huntType === 'price_only'
      ? await deps.serper.scoutPricingOnly(toolName, deps.withRetry, ctx.entityScope)
      : await deps.serper.scout(
          toolName,
          ctx.contextTitle,
          deps.withRetry,
          ctx.researchDossier?.scout_queries, // Pass dossier queries to Serper
          ctx.entityScope
        );

  deps.log(`Scout completed: ${scoutResult.raw_sources.length} sources found`);

  // Step 1.5: Name Collision Detection (prevent mixing data from different companies)
  const { detectNameCollision, filterConflictingSources } =
    await import('../validation/name-collision-detector.js');

  const collisionCheck = detectNameCollision(
    ctx.toolName,
    ctx.website || '', // Expected domain from classification
    scoutResult.raw_sources.map((source: any) => ({
      url: source.url,
      title: source.title,
      snippet: source.snippet,
      domain: source.domain,
    })),
    [], // Will check categories after extraction
    ctx.classification?.category // Expected category from classification
  );

  if (collisionCheck.detected) {
    deps.log(
      `[Name Collision] ⚠️  ${collisionCheck.confidence.toUpperCase()} confidence collision detected`
    );
    deps.log(`[Name Collision] Primary domain: ${collisionCheck.primaryDomain}`);
    if (collisionCheck.conflictingDomains.length > 0) {
      deps.log(
        `[Name Collision] Conflicting domains: ${collisionCheck.conflictingDomains.join(', ')}`
      );
    }
    if (collisionCheck.conflictingCategories.length > 0) {
      deps.log(
        `[Name Collision] Unexpected categories: ${collisionCheck.conflictingCategories.join(', ')}`
      );
    }

    // Only auto-filter for high-confidence collisions.
    // Medium/low confidence signals are logged for observability but not enforced.
    if (collisionCheck.confidence === 'high') {
      const originalCount = scoutResult.raw_sources.length;
      const filtered = filterConflictingSources(
        scoutResult.raw_sources.map((source: any) => ({
          url: source.url,
          title: source.title,
          snippet: source.snippet,
          domain: source.domain,
        })),
        collisionCheck.primaryDomain,
        collisionCheck.conflictingDomains
      );
      const filteredUrls = new Set(filtered.map((source: any) => source.url));
      scoutResult.raw_sources = scoutResult.raw_sources.filter((source: any) =>
        filteredUrls.has(source.url)
      );
      const filteredCount = originalCount - scoutResult.raw_sources.length;
      if (filteredCount > 0) {
        deps.log(`[Name Collision] Filtered ${filteredCount} sources from conflicting domains`);
      }
    } else {
      deps.log('[Name Collision] Observed only (no filtering for medium/low confidence)');
    }
  } else {
    deps.log(`[Name Collision] ✓ No collision detected`);
  }

  // Step 1.6: Check if tool is defunct (save API costs on dead tools)
  if (ctx.huntType !== 'price_only') {
    const searchSnippets = extractSearchSnippets(
      scoutResult.raw_sources.map((source: any) => ({
        snippet: source.snippet,
        title: source.title,
      }))
    );
    const defunctStatus = await detectDefunctTool(ctx.toolName, searchSnippets);

    if (defunctStatus.isDefunct && defunctStatus.confidence === 'high') {
      deps.log(`⚠️  Tool appears to be defunct: ${defunctStatus.reason || 'No longer available'}`);
      deps.log(`   Evidence: ${defunctStatus.evidence || 'Multiple shutdown indicators found'}`);

      // Return early - don't waste API credits on knowledge extraction
      return {
        scoutResult,
        knowledgeCard: null as any, // Will not be used
        isDuplicate: false,
        tokensUsed: 0,
        defunctStatus, // Pass defunct info to orchestrator
      };
    }
  }

  // Step 2: Extract structured facts (Pass 1 - The Librarian + Forensic Accountant + Investigator + Corporate Profiler)
  const snippetBuckets = buildSnippetBucketsFromScout(scoutResult.raw_sources);
  const { knowledgeCard, tokensUsed } = await deps.gemini.extractKnowledgeCard(
    {
      toolName: ctx.toolName,
      contextTitle: ctx.contextTitle, // Pass context for audience-aware extraction
      reviewsSnippets: snippetBuckets.reviewsSnippets,
      pricingSnippets: snippetBuckets.pricingSnippets,
      alternativesSnippets: snippetBuckets.alternativesSnippets,
      companySnippets: snippetBuckets.companySnippets,
      technicalSnippets: snippetBuckets.technicalSnippets,
      corporateProfilerSnippets: [],
      pricingDeepContent: scoutResult.pricingDeepContent, // Full page content from pricing pages
    },
    deps.withRetry,
    { mode: ctx.huntType === 'price_only' ? 'pricing_only' : 'full' }
  );

  deps.log(`[Pass 1] Knowledge Card extracted (quality: ${knowledgeCard.meta.data_quality})`);

  if (scoutResult.faqs && scoutResult.faqs.length > 0) {
    deps.log(`[FAQ] Extracted ${scoutResult.faqs.length} candidate questions`);
  } else {
    deps.log('[FAQ] ⚠️ No FAQ candidates extracted');
  }

  // ========== VALIDATION: Knowledge Card structure and business rules ==========
  const { validateKnowledgeCard, formatValidationReport } =
    await import('../validation/schema-validator.js');
  const validationReport = validateKnowledgeCard(knowledgeCard, ctx.toolName);
  deps.log(formatValidationReport(validationReport, 'Knowledge Card'));

  // ========== VALIDATION: Category consistency check ==========
  if (ctx.classification?.category && knowledgeCard.smp_taxonomy?.secondary_functions) {
    const expectedCat = ctx.classification.category.toLowerCase();
    const extractedCats = knowledgeCard.smp_taxonomy.secondary_functions.map((f: string) =>
      f.toLowerCase()
    );

    // Check for category mismatches (e.g., "devtools" vs "accounting")
    const categoryConflicts = extractedCats.filter((cat: string) => {
      // Major category mismatches
      if (expectedCat.includes('dev') && (cat.includes('accounting') || cat.includes('finance')))
        return true;
      if (expectedCat.includes('accounting') && cat.includes('dev')) return true;
      if (expectedCat.includes('code') && (cat.includes('accounting') || cat.includes('crm')))
        return true;
      return false;
    });

    if (categoryConflicts.length > 0) {
      deps.log(
        `[Category Validation] ⚠️  WARNING: Expected category "${ctx.classification.category}" but found conflicting: ${categoryConflicts.join(', ')}`
      );
      deps.log(
        `[Category Validation] This may indicate mixed data from companies with the same name`
      );
    } else {
      deps.log(`[Category Validation] ✓ Categories consistent with classification`);
    }
  }

  // ========== VALIDATION: Post-extraction domain check ==========
  if (knowledgeCard.website) {
    const { validateExtractedDomain, filterConflictingSources } =
      await import('../validation/name-collision-detector.js');

    const domainValidation = validateExtractedDomain(
      ctx.toolName,
      knowledgeCard.website,
      scoutResult.raw_sources.map((source: any) => ({
        url: source.url,
        title: source.title,
        snippet: source.snippet,
        domain: source.domain,
      })),
      collisionCheck.primaryDomain
    );

    if (!domainValidation.isValid) {
      deps.log(`[Domain Validation] ⚠️  ${domainValidation.warning}`);

      if (domainValidation.shouldRefilter) {
        deps.log(
          `[Domain Validation] Re-filtering sources with correct domain: ${domainValidation.correctDomain}`
        );

        // Find conflicting domains to filter out
        const conflicting = Array.from(
          new Set(
            scoutResult.raw_sources
              .map((s: any) => s.domain)
              .filter((d: any) => {
                const domainLower = d.toLowerCase();
                const toolNameLower = ctx.toolName.toLowerCase();
                return (
                  domainLower.includes(toolNameLower) &&
                  d !== domainValidation.correctDomain &&
                  !d.includes(domainValidation.correctDomain)
                );
              })
          )
        );

        if (conflicting.length > 0) {
          const originalCount = scoutResult.raw_sources.length;
          const filtered = filterConflictingSources(
            scoutResult.raw_sources.map((source: any) => ({
              url: source.url,
              title: source.title,
              snippet: source.snippet,
              domain: source.domain,
            })),
            domainValidation.correctDomain,
            conflicting as string[]
          );
          const filteredUrls = new Set(filtered.map((source: any) => source.url));
          scoutResult.raw_sources = scoutResult.raw_sources.filter((source: any) =>
            filteredUrls.has(source.url)
          );
          deps.log(
            `[Domain Validation] Filtered ${originalCount - scoutResult.raw_sources.length} sources from: ${conflicting.join(', ')}`
          );
          deps.log(
            `[Domain Validation] ⚠️  WARNING: Data was extracted from mixed sources. Consider re-running extraction.`
          );
        }
      }
    } else {
      deps.log(`[Domain Validation] ✓ Extracted website matches expected domain`);
    }
  }

  // Store validation results for metrics
  if (ctx.queueItemId) {
    await deps.supabase.rpc('log_metric', {
      p_metric_type: 'qa_score',
      p_metric_value: validationReport.score,
      p_tags: {
        phase: 'research',
        tool_name: ctx.toolName,
        is_valid: validationReport.isValid,
        should_publish: validationReport.shouldPublish,
        human_review_required: validationReport.humanReviewRequired,
      },
    });
  }

  // ========== QA LOGGING: COMPANY INFO (nested in company object) ==========
  const company = knowledgeCard.company;
  const companyFields = [];
  if (company?.name) companyFields.push(`company=${company.name}`);
  if (company?.founded_year) companyFields.push(`founded=${company.founded_year}`);
  if (company?.headquarters) companyFields.push(`HQ=${company.headquarters}`);
  if (company?.employee_count) companyFields.push(`employees=${company.employee_count}`);
  if (company?.funding_stage) companyFields.push(`funding=${company.funding_stage}`);
  if (companyFields.length > 0) {
    deps.log(`[Company] ${companyFields.join(', ')}`);
  } else {
    deps.log(`[Company] ⚠️ No company info extracted`);
  }

  // ========== QA LOGGING: KEY FEATURES (nested in features object) ==========
  const features = knowledgeCard.features;
  const coreFeatures = features?.core || [];
  const uniqueFeatures = features?.unique || [];
  const allFeatures = [...coreFeatures, ...uniqueFeatures];
  if (allFeatures.length > 0) {
    deps.log(
      `[Features] ${allFeatures.length} features: ${allFeatures.slice(0, 3).join(', ')}${allFeatures.length > 3 ? '...' : ''}`
    );
  } else {
    deps.log(`[Features] ⚠️ No key features extracted`);
  }

  // ========== QA LOGGING: COMPETITORS (nested in competitive object) ==========
  const competitors = knowledgeCard.competitive?.main_alternatives || [];
  if (competitors.length > 0) {
    deps.log(`[Competitors] ${competitors.join(', ')}`);
  } else {
    deps.log(`[Competitors] ⚠️ No competitors extracted`);
  }

  // ========== QA LOGGING: LEARNING CURVE ==========
  if (knowledgeCard.learning_curve) {
    deps.log(`[Learning] Time to productive: ${knowledgeCard.learning_curve}`);
  }

  // ========== QA LOGGING: INTEGRATIONS ==========
  if (knowledgeCard.integrations) {
    const int = knowledgeCard.integrations;
    const intFlags = [];
    if (int.has_api) intFlags.push('API');
    if (int.has_zapier) intFlags.push('Zapier');
    if (int.has_webhooks) intFlags.push('Webhooks');
    deps.log(
      `[Integrations] ${intFlags.length > 0 ? intFlags.join(', ') : '⚠️ none detected'}${int.notable?.length ? `, notable: ${int.notable.map((n: { name: string }) => n.name).join(', ')}` : ''}`
    );
  } else {
    deps.log(`[Integrations] ⚠️ Not extracted`);
  }

  // ========== QA LOGGING: SMP PRICING ==========
  if (knowledgeCard.smp_pricing) {
    const p = knowledgeCard.smp_pricing;
    deps.log(`[SMP Pricing] Model: ${p.model}, Confidence: ${p.confidence}`);
    deps.log(
      `[SMP Pricing] Currency: ${p.currency}, Billing: ${p.billing_cycles?.join(', ') || 'unknown'}`
    );
    if (p.annual_discount_pct) deps.log(`[SMP Pricing] Annual discount: ${p.annual_discount_pct}%`);
    if (p.min_seats) deps.log(`[SMP Pricing] Min seats: ${p.min_seats}`);
    if (p.plans && p.plans.length > 0) {
      deps.log(`[SMP Pricing] Plans (${p.plans.length}):`);
      for (const plan of p.plans) {
        const priceInfo = [];
        if (plan.price_monthly !== null) priceInfo.push(`$${plan.price_monthly}/mo`);
        if (plan.price_annual !== null) priceInfo.push(`$${plan.price_annual}/yr`);
        if (plan.price_per_unit !== null)
          priceInfo.push(`$${plan.price_per_unit}/${plan.scaling_unit || 'unit'}`);
        const features = [];
        if (plan.includes_sso) features.push('SSO');
        if (plan.includes_api) features.push('API');
        if (plan.includes_sla) features.push('SLA');
        if (plan.max_users !== null) features.push(`max ${plan.max_users} users`);
        if (plan.included_units !== null)
          features.push(`includes ${plan.included_units} ${plan.scaling_unit || 'units'}`);
        deps.log(
          `  - ${plan.name} (${plan.id}): ${priceInfo.join(', ') || 'custom'} ${features.length ? `[${features.join(', ')}]` : ''}`
        );
      }
    }
  } else {
    deps.log(`[SMP Pricing] ⚠️ Not extracted`);
  }

  // ========== QA LOGGING: SMP TAXONOMY ==========
  if (knowledgeCard.smp_taxonomy) {
    const t = knowledgeCard.smp_taxonomy;
    deps.log(`[SMP Taxonomy] Primary: ${t.primary_function}`);
    if (t.secondary_functions?.length)
      deps.log(`[SMP Taxonomy] Secondary: ${t.secondary_functions.join(', ')}`);
    if (t.likely_departments?.length)
      deps.log(`[SMP Taxonomy] Departments: ${t.likely_departments.join(', ')}`);
  } else {
    deps.log(`[SMP Taxonomy] ⚠️ Not extracted`);
  }

  // ========== QA LOGGING: SMP PORTABILITY ==========
  if (knowledgeCard.smp_portability) {
    const port = knowledgeCard.smp_portability;
    deps.log(
      `[SMP Portability] Export: ${port.has_data_export ? 'yes' : 'no'}, API Export: ${port.has_api_export ? 'yes' : 'no'}, Migration: ${port.migration_difficulty || 'unknown'}`
    );
    if (port.export_formats?.length)
      deps.log(`[SMP Portability] Formats: ${port.export_formats.join(', ')}`);
  } else {
    deps.log(`[SMP Portability] ⚠️ Not extracted`);
  }

  // ========== QA LOGGING: CONSTRAINTS ==========
  if (knowledgeCard.constraints) {
    const c = knowledgeCard.constraints;
    if (c.hard_limits && c.hard_limits.length > 0) {
      deps.log(`[Constraints] Hard limits (${c.hard_limits.length}):`);
      for (const limit of c.hard_limits) {
        const planLabel = limit.plan_name_match || 'All plans';
        deps.log(`  - ${limit.type}: ${limit.value} [${limit.consequence}] (${planLabel})`);
      }
    }
    if (c.hidden_costs && c.hidden_costs.length > 0) {
      deps.log(`[Constraints] Hidden costs (${c.hidden_costs.length}):`);
      for (const cost of c.hidden_costs) {
        const costLabel = cost.cost ? `$${cost.cost}` : 'variable';
        deps.log(`  - ${cost.description} (${costLabel})`);
      }
    }
  }

  // ========== QA LOGGING: SETUP COMPLEXITY ==========
  if (knowledgeCard.setup_complexity) {
    const setup = knowledgeCard.setup_complexity;
    const setupFlags = [];
    if (setup.requires_developer) setupFlags.push('Dev');
    if (setup.requires_it_admin) setupFlags.push('IT Admin');
    if (setup.implementation_partner_needed) setupFlags.push('Partner');

    deps.log(
      `[Setup] Time: ${setup.estimated_setup_time}, Type: ${setup.setup_type || 'unknown'}, Friction: ${setup.friction_score || 'N/A'}/10`
    );
    if (setupFlags.length > 0) {
      deps.log(`[Setup] Required: ${setupFlags.join(', ')}`);
    }

    if (setup.steps && setup.steps.length > 0) {
      deps.log(`[Setup] Steps (${setup.steps.length}):`);
      for (const step of setup.steps.slice(0, 3)) {
        // Show first 3 steps
        const cmd = step.command ? ` \`${step.command}\`` : '';
        deps.log(`  ${step.step}. ${step.action}${cmd}`);
      }
      if (setup.steps.length > 3) {
        deps.log(`  ... ${setup.steps.length - 3} more steps`);
      }
    }

    if (setup.aha_moment) {
      deps.log(`[Setup] Aha moment: ${setup.aha_moment}`);
    }

    if (setup.red_tape) {
      const redTapeFlags = [];
      if (setup.red_tape.cc_required) redTapeFlags.push('CC required');
      if (setup.red_tape.domain_required) redTapeFlags.push('Domain required');
      if (setup.red_tape.admin_required) redTapeFlags.push('Admin access');
      if (setup.red_tape.sales_gated) redTapeFlags.push('Sales gated');
      if (setup.red_tape.approval_required) redTapeFlags.push('Approval required');
      if (redTapeFlags.length > 0) {
        deps.log(`[Setup] 🚨 Red tape: ${redTapeFlags.join(', ')}`);
      }
    }
  } else {
    deps.log(`[Setup] ⚠️ Not extracted`);
  }

  // ========== QA SUMMARY ==========
  const qaScore = [
    knowledgeCard.company?.name ? 1 : 0,
    knowledgeCard.company?.founded_year ? 1 : 0,
    knowledgeCard.features?.core?.length || knowledgeCard.features?.unique?.length ? 1 : 0,
    knowledgeCard.competitive?.main_alternatives?.length ? 1 : 0,
    knowledgeCard.integrations?.has_api !== undefined ? 1 : 0,
    knowledgeCard.smp_pricing ? 1 : 0,
    knowledgeCard.smp_taxonomy ? 1 : 0,
    knowledgeCard.smp_portability ? 1 : 0,
    knowledgeCard.setup_complexity ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  deps.log(`[QA Score] ${qaScore}/9 data categories populated`);

  // Step 2.5: Detect category for batch synthesis grouping
  // Uses same logic as analysis phase for consistency
  const detectedCategory = detectCategoryFromResearch(
    knowledgeCard,
    ctx.contextTitle,
    ctx.researchDossier?.primary_category,
    deps
  );
  if (detectedCategory) {
    ctx.detectedCategory = detectedCategory;
    deps.log(`[Category Detection] Detected: ${detectedCategory}`);
  } else {
    deps.log('[Category Detection] None detected, will use individual synthesis');
  }

  // Step 3: Check for duplicate tools (Gatekeeper)
  const existingTool = await checkForDuplicateTool(
    ctx.toolName,
    knowledgeCard,
    deps,
    ctx.entityScope
  );

  if (existingTool) {
    deps.log(`⚠️ Duplicate detected: "${ctx.toolName}" already exists (id: ${existingTool.id})`);
    return {
      scoutResult: {
        raw_sources: scoutResult.raw_sources,
        curated_sources: scoutResult.curated_sources,
        facts: scoutResult.facts,
        scrape_plan: scoutResult.scrape_plan,
        quality: scoutResult.quality,
        faqs: scoutResult.faqs,
      },
      knowledgeCard,
      tokensUsed,
      isDuplicate: true,
      existingToolId: existingTool.id,
      validationReport: {
        isValid: validationReport.isValid,
        score: validationReport.score,
        shouldPublish: validationReport.shouldPublish,
        humanReviewRequired: validationReport.humanReviewRequired,
      },
    };
  }

  deps.log(`[Phase 1] Complete - No duplicates found`);

  return {
    scoutResult: {
      raw_sources: scoutResult.raw_sources,
      curated_sources: scoutResult.curated_sources,
      facts: scoutResult.facts,
      scrape_plan: scoutResult.scrape_plan,
      quality: scoutResult.quality,
      faqs: scoutResult.faqs,
    },
    knowledgeCard,
    tokensUsed,
    isDuplicate: false,
    validationReport: {
      isValid: validationReport.isValid,
      score: validationReport.score,
      shouldPublish: validationReport.shouldPublish,
      humanReviewRequired: validationReport.humanReviewRequired,
    },
  };
}

/**
 * Check if tool already exists in database
 *
 * Uses Postgres pg_trgm trigram similarity for fast fuzzy matching.
 * This replaces the old O(n) in-memory check with an indexed query.
 *
 * @param toolName - Tool name to check
 * @param knowledgeCard - Knowledge card with extracted facts
 * @param deps - Dependencies for DB access
 * @returns Existing tool info if duplicate found, null otherwise
 */
async function checkForDuplicateTool(
  toolName: string,
  knowledgeCard: KnowledgeCard,
  deps: HunterDependencies,
  entityScope?: string
): Promise<{ id: string; name: string } | null> {
  const normalizedInputDomain = extractDomain(knowledgeCard.website_url);

  // Use Postgres trigram similarity function (fast, indexed)
  const { data, error } = await deps.supabase.rpc('find_duplicate_item', {
    p_tool_name: toolName,
    p_website_url: knowledgeCard.website_url || null,
    p_similarity_threshold: 0.9,
  });

  if (error) {
    deps.log(`⚠️  Duplicate detection error: ${error.message}`);
    return null;
  }

  if (data && data.length > 0) {
    const match = data[0];
    const normalizedMatchDomain = extractDomain(match.website);
    const sameDomain =
      !!normalizedInputDomain &&
      !!normalizedMatchDomain &&
      normalizedInputDomain === normalizedMatchDomain;
    const acceptableNameMatch = hasMeaningfulProductTokenOverlap(toolName, match.name);

    // Guardrail: avoid same-vendor cross-product collisions (e.g., "Zoho Books" -> "Zoho CRM").
    if (!sameDomain && !acceptableNameMatch) {
      deps.log(
        `Duplicate rejected: "${match.name}" lacks product-token overlap with "${toolName}" (score=${match.similarity_score})`
      );
      return null;
    }

    const similarityPct = (match.similarity_score * 100).toFixed(1);
    deps.log(`Duplicate found: "${match.name}" (similarity: ${similarityPct}%)`);

    if (entityScope) {
      const sameScopeExists = await hasExistingReviewForEntityScope(match.id, entityScope, deps);
      if (!sameScopeExists) {
        deps.log(
          `Duplicate bypassed: existing item has no persisted review evidence for scope "${entityScope}" yet`
        );
        return null;
      }
      deps.log(`Duplicate confirmed for matching scope "${entityScope}"`);
    }

    return { id: match.id, name: match.name };
  }

  return null;
}

function reviewHasEntityScope(review: { sources?: unknown }, targetScope: string): boolean {
  const normalizedTarget = targetScope.trim().toLowerCase();
  if (!normalizedTarget) return false;

  const sources = review.sources;
  if (!Array.isArray(sources)) return false;
  return sources.some((source) => {
    if (!source || typeof source !== 'object') return false;
    const entityScope = (source as Record<string, unknown>).entity_scope;
    return typeof entityScope === 'string' && entityScope.trim().toLowerCase() === normalizedTarget;
  });
}

async function hasExistingReviewForEntityScope(
  itemId: string,
  entityScope: string,
  deps: HunterDependencies
): Promise<boolean> {
  const normalizedScope = entityScope.trim().toLowerCase();
  const { data, error } = await deps.supabase
    .from('reviews')
    .select('id, status, sources')
    .eq('item_id', itemId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    deps.log(`⚠️  Scoped duplicate check failed for reviews: ${error.message}`);
    return false;
  }

  const reviews = (data || []) as Array<{ status?: string | null; sources?: unknown }>;
  if (reviews.length === 0) {
    return false;
  }

  // Backward-compatibility guardrail: legacy discovery reviews often have no per-source
  // scope tagging. For core scope, any persisted draft/review/published review should
  // count as existing evidence so we avoid duplicate item creation.
  if (normalizedScope === 'core') {
    const hasPersistedReview = reviews.some((review) => {
      const status = review.status?.trim().toLowerCase();
      return status === 'draft' || status === 'review' || status === 'published';
    });
    if (hasPersistedReview) {
      return true;
    }
  }

  return reviews.some((review) => reviewHasEntityScope(review, entityScope));
}

function extractDomain(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const raw = url.trim().toLowerCase();
  if (!raw) return null;
  try {
    const withProtocol =
      raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname.replace(/^www\./, '');
  } catch {
    return (
      raw
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0] || null
    );
  }
}

function hasMeaningfulProductTokenOverlap(a: string, b: string): boolean {
  const normalizeSimple = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const simpleA = normalizeSimple(a);
  const simpleB = normalizeSimple(b);
  if (simpleA && simpleB && simpleA === simpleB) return true;

  const vendorTokens = new Set([
    'anthropic',
    'openai',
    'google',
    'microsoft',
    'meta',
    'xai',
    'amazon',
    'aws',
    'zoho',
    'hubspot',
    'salesforce',
    'atlassian',
  ]);

  const normalize = (value: string): string[] =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((token) => token.length > 1 && !vendorTokens.has(token));

  const tokensA = new Set(normalize(a));
  const tokensB = new Set(normalize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return false;
  for (const token of tokensA) {
    if (tokensB.has(token)) return true;
  }
  return false;
}

/**
 * Detect category from research data for batch grouping
 *
 * Mirrors the logic in analysis.ts detectToolCategory() for consistency.
 * Used during research phase to enable batch synthesis grouping.
 *
 * @param knowledgeCard - Knowledge card with extracted facts
 * @param contextTitle - Optional context title for keyword matching
 * @param deps - Dependencies for logging
 * @returns Category slug or undefined if not detected
 */
function detectCategoryFromResearch(
  knowledgeCard: KnowledgeCard,
  contextTitle: string | undefined,
  dossierPrimaryCategory: string | undefined,
  _deps: HunterDependencies
): string | undefined {
  return resolveDetectedCategory({
    dossierPrimaryCategory,
    taxonomyPrimaryFunction: knowledgeCard?.smp_taxonomy?.primary_function,
    contextTitle,
  });
}

export { normalizeCategory } from '../validation/category-validator.js';
