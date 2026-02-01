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

  // Step 1: Scout for information
  const scoutResult = await deps.serper.scout(
    ctx.toolName,
    ctx.contextTitle,
    deps.withRetry
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

  // Step 2: Extract structured facts (Pass 1 - The Librarian + Forensic Accountant + Investigator)
  const { knowledgeCard, tokensUsed } = await deps.gemini.extractKnowledgeCard(
    {
      toolName: ctx.toolName,
      contextTitle: ctx.contextTitle, // Pass context for audience-aware extraction
      reviewsSnippets: scoutResult.reviewsSnippets,
      pricingSnippets: scoutResult.pricingSnippets,
      alternativesSnippets: scoutResult.alternativesSnippets,
      companySnippets: scoutResult.companySnippets,
      technicalSnippets: scoutResult.technicalSnippets,
      pricingDeepContent: scoutResult.pricingDeepContent, // Full page content from pricing pages
    },
    deps.withRetry
  );

  deps.log(`[Pass 1] Knowledge Card extracted (quality: ${knowledgeCard.meta.data_quality})`);

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
  };
}

/**
 * Check if tool already exists in database
 *
 * Uses fuzzy name matching and website URL comparison.
 * Prevents duplicate entries for the same tool.
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
  const { data: items } = await deps.supabase
    .from('items')
    .select('id, name, website')
    .limit(1000);

  if (!items || items.length === 0) return null;

  const normalize = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizedInput = normalize(toolName);
  const inputWebsite = knowledgeCard.website_url
    ? normalize(new URL(knowledgeCard.website_url).hostname)
    : null;

  for (const item of items) {
    // Check 1: Exact name match (normalized)
    if (normalize(item.name) === normalizedInput) {
      deps.log(`Duplicate found by name: "${item.name}"`);
      return { id: item.id, name: item.name };
    }

    // Check 2: Website URL match
    if (inputWebsite && item.website) {
      const itemWebsite = normalize(new URL(item.website).hostname);
      if (itemWebsite === inputWebsite) {
        deps.log(`Duplicate found by website: ${item.website}`);
        return { id: item.id, name: item.name };
      }
    }

    // Check 3: High similarity (Levenshtein-like)
    const similarity = calculateSimilarity(normalizedInput, normalize(item.name));
    if (similarity >= 0.9) {
      deps.log(`Duplicate found by similarity (${(similarity * 100).toFixed(1)}%): "${item.name}"`);
      return { id: item.id, name: item.name };
    }
  }

  return null;
}

/**
 * Calculate Jaccard similarity between two strings
 */
function calculateSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter(c => setB.has(c)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
