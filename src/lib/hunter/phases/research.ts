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
import type {
  HunterContext,
  HunterDependencies,
  ResearchOutput,
} from '../types';
import { detectDefunctTool, extractSearchSnippets } from '../services/defunct-detector.js';

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

  // If we have a Research Dossier from the Classifier, use its normalized name
  const toolName = ctx.researchDossier?.normalized_tool_name || ctx.toolName;

  // Log dossier usage for cost tracking
  if (ctx.researchDossier) {
    deps.log(`[Dossier] Using pre-generated queries (${ctx.researchDossier.scout_queries.length} queries)`);
    deps.log(`[Dossier] Category: ${ctx.researchDossier.primary_category} | Confidence: ${ctx.researchDossier.confidence}`);
    if (ctx.researchDossier.red_flags?.length) {
      deps.log(`[Dossier] 🚩 Red flags: ${ctx.researchDossier.red_flags.join('; ')}`);
    }
  }

  // Step 1: Scout for information (use dossier queries if available)
  const scoutResult = await deps.serper.scout(
    toolName,
    ctx.contextTitle,
    deps.withRetry,
    ctx.researchDossier?.scout_queries // Pass dossier queries to Serper
  );

  deps.log(`Scout completed: ${scoutResult.sources.length} sources found`);

  // Step 1.5: Check if tool is defunct (save API costs on dead tools)
  const searchSnippets = extractSearchSnippets(scoutResult.sources);
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

  // Step 2: Extract structured facts (Pass 1 - The Librarian + Forensic Accountant + Investigator + Corporate Profiler)
  const { knowledgeCard, tokensUsed } = await deps.gemini.extractKnowledgeCard(
    {
      toolName: ctx.toolName,
      contextTitle: ctx.contextTitle, // Pass context for audience-aware extraction
      reviewsSnippets: scoutResult.reviewsSnippets,
      pricingSnippets: scoutResult.pricingSnippets,
      alternativesSnippets: scoutResult.alternativesSnippets,
      companySnippets: scoutResult.companySnippets,
      technicalSnippets: scoutResult.technicalSnippets,
      corporateProfilerSnippets: scoutResult.corporateProfilerSnippets, // V4: Crunchbase/LinkedIn/stock data
      pricingDeepContent: scoutResult.pricingDeepContent, // Full page content from pricing pages
    },
    deps.withRetry
  );

  deps.log(`[Pass 1] Knowledge Card extracted (quality: ${knowledgeCard.meta.data_quality})`);

  // ========== VALIDATION: Knowledge Card structure and business rules ==========
  const { validateKnowledgeCard, formatValidationReport } = await import('../validation/schema-validator.js');
  const validationReport = validateKnowledgeCard(knowledgeCard, ctx.toolName);
  deps.log(formatValidationReport(validationReport, 'Knowledge Card'));

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
    deps.log(`[Features] ${allFeatures.length} features: ${allFeatures.slice(0, 3).join(', ')}${allFeatures.length > 3 ? '...' : ''}`);
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
    deps.log(`[Integrations] ${intFlags.length > 0 ? intFlags.join(', ') : '⚠️ none detected'}${int.notable?.length ? `, notable: ${int.notable.map(n => n.name).join(', ')}` : ''}`);
  } else {
    deps.log(`[Integrations] ⚠️ Not extracted`);
  }

  // ========== QA LOGGING: PRICING ANALYSIS (Chain of Thought) ==========
  if (knowledgeCard.pricing_analysis_log) {
    deps.log(`[Pricing CoT] ${knowledgeCard.pricing_analysis_log.substring(0, 200)}${knowledgeCard.pricing_analysis_log.length > 200 ? '...' : ''}`);
  }

  // ========== QA LOGGING: SMP PRICING ==========
  if (knowledgeCard.smp_pricing) {
    const p = knowledgeCard.smp_pricing;
    deps.log(`[SMP Pricing] Model: ${p.model}, Confidence: ${p.confidence}`);
    deps.log(`[SMP Pricing] Currency: ${p.currency}, Billing: ${p.billing_cycles?.join(', ') || 'unknown'}`);
    if (p.annual_discount_pct) deps.log(`[SMP Pricing] Annual discount: ${p.annual_discount_pct}%`);
    if (p.min_seats) deps.log(`[SMP Pricing] Min seats: ${p.min_seats}`);
    if (p.plans && p.plans.length > 0) {
      deps.log(`[SMP Pricing] Plans (${p.plans.length}):`);
      for (const plan of p.plans) {
        const priceInfo = [];
        if (plan.price_monthly !== null) priceInfo.push(`$${plan.price_monthly}/mo`);
        if (plan.price_annual !== null) priceInfo.push(`$${plan.price_annual}/yr`);
        if (plan.price_per_unit !== null) priceInfo.push(`$${plan.price_per_unit}/${plan.scaling_unit || 'unit'}`);
        const features = [];
        if (plan.includes_sso) features.push('SSO');
        if (plan.includes_api) features.push('API');
        if (plan.includes_sla) features.push('SLA');
        if (plan.max_users !== null) features.push(`max ${plan.max_users} users`);
        if (plan.included_units !== null) features.push(`includes ${plan.included_units} ${plan.scaling_unit || 'units'}`);
        deps.log(`  - ${plan.name} (${plan.id}): ${priceInfo.join(', ') || 'custom'} ${features.length ? `[${features.join(', ')}]` : ''}`);
      }
    }
  } else {
    deps.log(`[SMP Pricing] ⚠️ Not extracted`);
  }

  // ========== QA LOGGING: SMP TAXONOMY ==========
  if (knowledgeCard.smp_taxonomy) {
    const t = knowledgeCard.smp_taxonomy;
    deps.log(`[SMP Taxonomy] Primary: ${t.primary_function}`);
    if (t.secondary_functions?.length) deps.log(`[SMP Taxonomy] Secondary: ${t.secondary_functions.join(', ')}`);
    if (t.likely_departments?.length) deps.log(`[SMP Taxonomy] Departments: ${t.likely_departments.join(', ')}`);
  } else {
    deps.log(`[SMP Taxonomy] ⚠️ Not extracted`);
  }

  // ========== QA LOGGING: SMP PORTABILITY ==========
  if (knowledgeCard.smp_portability) {
    const port = knowledgeCard.smp_portability;
    deps.log(`[SMP Portability] Export: ${port.has_data_export ? 'yes' : 'no'}, API Export: ${port.has_api_export ? 'yes' : 'no'}, Migration: ${port.migration_difficulty || 'unknown'}`);
    if (port.export_formats?.length) deps.log(`[SMP Portability] Formats: ${port.export_formats.join(', ')}`);
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

  // ========== QA SUMMARY ==========
  const qaScore = [
    knowledgeCard.company?.name ? 1 : 0,
    knowledgeCard.company?.founded_year ? 1 : 0,
    (knowledgeCard.features?.core?.length || knowledgeCard.features?.unique?.length) ? 1 : 0,
    knowledgeCard.competitive?.main_alternatives?.length ? 1 : 0,
    knowledgeCard.integrations?.has_api !== undefined ? 1 : 0,
    knowledgeCard.smp_pricing ? 1 : 0,
    knowledgeCard.smp_taxonomy ? 1 : 0,
    knowledgeCard.smp_portability ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  deps.log(`[QA Score] ${qaScore}/8 data categories populated`);

  // Step 3: Check for duplicate tools (Gatekeeper)
  const existingTool = await checkForDuplicateTool(
    ctx.toolName,
    knowledgeCard,
    deps
  );

  if (existingTool) {
    deps.log(`⚠️ Duplicate detected: "${ctx.toolName}" already exists (id: ${existingTool.id})`);
    return {
      scoutResult: {
        reviewsSnippets: scoutResult.reviewsSnippets,
        pricingSnippets: scoutResult.pricingSnippets,
        alternativesSnippets: scoutResult.alternativesSnippets,
        companySnippets: scoutResult.companySnippets,
        technicalSnippets: scoutResult.technicalSnippets,
        budgetAnalystSnippets: scoutResult.budgetAnalystSnippets,
        tribalKnowledgeSnippets: scoutResult.tribalKnowledgeSnippets,
        sources: scoutResult.sources,
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
      reviewsSnippets: scoutResult.reviewsSnippets,
      pricingSnippets: scoutResult.pricingSnippets,
      alternativesSnippets: scoutResult.alternativesSnippets,
      companySnippets: scoutResult.companySnippets,
      technicalSnippets: scoutResult.technicalSnippets,
      budgetAnalystSnippets: scoutResult.budgetAnalystSnippets,
      tribalKnowledgeSnippets: scoutResult.tribalKnowledgeSnippets,
      sources: scoutResult.sources,
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
  deps: HunterDependencies
): Promise<{ id: string; name: string } | null> {
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
    const similarityPct = (match.similarity_score * 100).toFixed(1);
    deps.log(`Duplicate found: "${match.name}" (similarity: ${similarityPct}%)`);
    return { id: match.id, name: match.name };
  }

  return null;
}
