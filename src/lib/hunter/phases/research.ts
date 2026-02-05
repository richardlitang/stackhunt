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
import { normalizeCategory } from '../validation/category-validator.js';

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
  const scoutResult = ctx.huntType === 'price_only'
    ? await deps.serper.scoutPricingOnly(toolName, deps.withRetry)
    : await deps.serper.scout(
        toolName,
        ctx.contextTitle,
        deps.withRetry,
        ctx.researchDossier?.scout_queries // Pass dossier queries to Serper
      );

  deps.log(`Scout completed: ${scoutResult.sources.length} sources found`);

  // Step 1.5: Name Collision Detection (prevent mixing data from different companies)
  const { detectNameCollision, filterConflictingSources } = await import('../validation/name-collision-detector.js');

  const collisionCheck = detectNameCollision(
    ctx.toolName,
    ctx.website || '', // Expected domain from classification
    scoutResult.sources,
    [], // Will check categories after extraction
    ctx.classification?.category // Expected category from classification
  );

  if (collisionCheck.detected) {
    deps.log(`[Name Collision] ⚠️  ${collisionCheck.confidence.toUpperCase()} confidence collision detected`);
    deps.log(`[Name Collision] Primary domain: ${collisionCheck.primaryDomain}`);
    if (collisionCheck.conflictingDomains.length > 0) {
      deps.log(`[Name Collision] Conflicting domains: ${collisionCheck.conflictingDomains.join(', ')}`);
    }
    if (collisionCheck.conflictingCategories.length > 0) {
      deps.log(`[Name Collision] Unexpected categories: ${collisionCheck.conflictingCategories.join(', ')}`);
    }

    // Filter out conflicting sources
    const originalCount = scoutResult.sources.length;
    scoutResult.sources = filterConflictingSources(
      scoutResult.sources,
      collisionCheck.primaryDomain,
      collisionCheck.conflictingDomains
    );
    const filteredCount = originalCount - scoutResult.sources.length;
    if (filteredCount > 0) {
      deps.log(`[Name Collision] Filtered ${filteredCount} sources from conflicting domains`);
    }
  } else {
    deps.log(`[Name Collision] ✓ No collision detected`);
  }

  // Step 1.6: Check if tool is defunct (save API costs on dead tools)
  if (ctx.huntType !== 'price_only') {
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
    deps.withRetry,
    { mode: ctx.huntType === 'price_only' ? 'pricing_only' : 'full' }
  );

  deps.log(`[Pass 1] Knowledge Card extracted (quality: ${knowledgeCard.meta.data_quality})`);

  // Attach authentic FAQs from research sources (PAA / forums / Reddit)
  if (scoutResult.faqs && scoutResult.faqs.length > 0) {
    knowledgeCard.faqs = scoutResult.faqs;
    deps.log(`[FAQ] Extracted ${scoutResult.faqs.length} authentic questions`);
  } else {
    deps.log('[FAQ] ⚠️ No authentic FAQs extracted');
  }

  // ========== VALIDATION: Knowledge Card structure and business rules ==========
  const { validateKnowledgeCard, formatValidationReport } = await import('../validation/schema-validator.js');
  const validationReport = validateKnowledgeCard(knowledgeCard, ctx.toolName);
  deps.log(formatValidationReport(validationReport, 'Knowledge Card'));

  // ========== VALIDATION: Category consistency check ==========
  if (ctx.classification?.category && knowledgeCard.smp_taxonomy?.secondary_functions) {
    const expectedCat = ctx.classification.category.toLowerCase();
    const extractedCats = knowledgeCard.smp_taxonomy.secondary_functions.map((f: string) => f.toLowerCase());

    // Check for category mismatches (e.g., "devtools" vs "accounting")
    const categoryConflicts = extractedCats.filter((cat: string) => {
      // Major category mismatches
      if (expectedCat.includes('dev') && (cat.includes('accounting') || cat.includes('finance'))) return true;
      if (expectedCat.includes('accounting') && cat.includes('dev')) return true;
      if (expectedCat.includes('code') && (cat.includes('accounting') || cat.includes('crm'))) return true;
      return false;
    });

    if (categoryConflicts.length > 0) {
      deps.log(`[Category Validation] ⚠️  WARNING: Expected category "${ctx.classification.category}" but found conflicting: ${categoryConflicts.join(', ')}`);
      deps.log(`[Category Validation] This may indicate mixed data from companies with the same name`);
    } else {
      deps.log(`[Category Validation] ✓ Categories consistent with classification`);
    }
  }

  // ========== VALIDATION: Post-extraction domain check ==========
  if (knowledgeCard.website) {
    const { validateExtractedDomain, filterConflictingSources } = await import('../validation/name-collision-detector.js');

    const domainValidation = validateExtractedDomain(
      ctx.toolName,
      knowledgeCard.website,
      scoutResult.sources,
      collisionCheck.primaryDomain
    );

    if (!domainValidation.isValid) {
      deps.log(`[Domain Validation] ⚠️  ${domainValidation.warning}`);

      if (domainValidation.shouldRefilter) {
        deps.log(`[Domain Validation] Re-filtering sources with correct domain: ${domainValidation.correctDomain}`);

        // Find conflicting domains to filter out
        const conflicting = Array.from(new Set(
          scoutResult.sources
            .map(s => s.domain)
            .filter(d => {
              const domainLower = d.toLowerCase();
              const toolNameLower = ctx.toolName.toLowerCase();
              return domainLower.includes(toolNameLower) &&
                     d !== domainValidation.correctDomain &&
                     !d.includes(domainValidation.correctDomain);
            })
        ));

        if (conflicting.length > 0) {
          const originalCount = scoutResult.sources.length;
          scoutResult.sources = filterConflictingSources(
            scoutResult.sources,
            domainValidation.correctDomain,
            conflicting
          );
          deps.log(`[Domain Validation] Filtered ${originalCount - scoutResult.sources.length} sources from: ${conflicting.join(', ')}`);
          deps.log(`[Domain Validation] ⚠️  WARNING: Data was extracted from mixed sources. Consider re-running extraction.`);
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
    deps.log(`[Integrations] ${intFlags.length > 0 ? intFlags.join(', ') : '⚠️ none detected'}${int.notable?.length ? `, notable: ${int.notable.map((n: { name: string }) => n.name).join(', ')}` : ''}`);
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

  // ========== QA LOGGING: SETUP COMPLEXITY ==========
  if (knowledgeCard.setup_complexity) {
    const setup = knowledgeCard.setup_complexity;
    const setupFlags = [];
    if (setup.requires_developer) setupFlags.push('Dev');
    if (setup.requires_it_admin) setupFlags.push('IT Admin');
    if (setup.implementation_partner_needed) setupFlags.push('Partner');

    deps.log(`[Setup] Time: ${setup.estimated_setup_time}, Type: ${setup.setup_type || 'unknown'}, Friction: ${setup.friction_score || 'N/A'}/10`);
    if (setupFlags.length > 0) {
      deps.log(`[Setup] Required: ${setupFlags.join(', ')}`);
    }

    if (setup.steps && setup.steps.length > 0) {
      deps.log(`[Setup] Steps (${setup.steps.length}):`);
      for (const step of setup.steps.slice(0, 3)) {  // Show first 3 steps
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
    (knowledgeCard.features?.core?.length || knowledgeCard.features?.unique?.length) ? 1 : 0,
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
  const detectedCategory = detectCategoryFromResearch(knowledgeCard, ctx.contextTitle, deps);
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
        tribalDeepContent: scoutResult.tribalDeepContent,
        faqs: scoutResult.faqs,
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
      tribalDeepContent: scoutResult.tribalDeepContent,
      faqs: scoutResult.faqs,
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
  deps: HunterDependencies
): string | undefined {
  // Priority 1: Infer from knowledge card taxonomy
  const taxonomy = knowledgeCard?.smp_taxonomy;
  if (taxonomy?.primary_function) {
    const functionToCategory: Record<string, string> = {
      // Infrastructure
      'Database': 'databases',
      'Serverless': 'serverless',
      'Backend as a Service': 'baas',
      'Cloud Infrastructure': 'infrastructure',
      // Developer Tools
      'CI/CD': 'ci-cd',
      'Monitoring': 'monitoring',
      'API Development': 'api-development',
      'Version Control': 'version-control',
      'Developer Tools': 'developer-tools',
      'IDE': 'developer-tools',
      'Code Editor': 'developer-tools',
      'AI Code Assistant': 'ai-code-editors',
      'AI Code Editor': 'ai-code-editors',
      // Productivity
      'Project Management': 'project-management',
      'Note-Taking': 'note-taking',
      'Documentation': 'documentation',
      'Knowledge Management': 'productivity',
      // Communication
      'Team Chat': 'team-chat',
      'Video Conferencing': 'video-conferencing',
      'Communication': 'communication',
      // CRM & Sales
      'CRM': 'crm-sales',
      'Sales Engagement': 'sales-crm',
      'Marketing Automation': 'marketing-automation',
      // Analytics
      'Product Analytics': 'product-analytics',
      'Web Analytics': 'web-analytics',
      'Business Intelligence': 'analytics-bi',
      // eCommerce
      'Payment Processing': 'payment-processing',
      'eCommerce Platform': 'ecommerce-platform',
      'eCommerce': 'ecommerce-payments',
      // Other
      'Customer Support': 'customer-support',
      'HR': 'hr-recruiting',
      'Finance': 'finance',
      'Security': 'security-identity',
      'Design': 'design-marketing',
      'Marketing': 'design-marketing',
      'No-Code': 'no-code-low-code',
      'Low-Code': 'no-code-low-code',
      'CMS': 'cms-website',
      'File Storage': 'file-storage',
      'Scheduling': 'scheduling',
      'AI': 'ai-automation',
      'AI Tools': 'ai-automation',
      'Automation': 'ai-automation',
    };

    const mapped = functionToCategory[taxonomy.primary_function];
    if (mapped) {
      return normalizeCategory(mapped);
    }
  }

  // Priority 2: Match from context title keywords
  if (contextTitle) {
    const titleLower = contextTitle.toLowerCase();
    const keywordToCategory: Record<string, string> = {
      'ai code': 'ai-code-editors',
      'ai editor': 'ai-code-editors',
      'code editor': 'developer-tools',
      'database': 'databases',
      'serverless': 'serverless',
      'backend': 'baas',
      'ci/cd': 'ci-cd',
      'monitoring': 'monitoring',
      'observability': 'monitoring',
      'api': 'api-development',
      'project management': 'project-management',
      'task management': 'project-management',
      'note': 'note-taking',
      'documentation': 'documentation',
      'wiki': 'documentation',
      'chat': 'team-chat',
      'slack': 'team-chat',
      'video': 'video-conferencing',
      'meeting': 'video-conferencing',
      'crm': 'crm-sales',
      'sales': 'sales-crm',
      'marketing automation': 'marketing-automation',
      'analytics': 'analytics-bi',
      'payment': 'payment-processing',
      'ecommerce': 'ecommerce-platform',
      'support': 'customer-support',
      'helpdesk': 'customer-support',
      'hr': 'hr-recruiting',
      'recruiting': 'hr-recruiting',
      'accounting': 'finance',
      'security': 'security-identity',
      'auth': 'security-identity',
      'design': 'design-marketing',
      'no-code': 'no-code-low-code',
      'low-code': 'no-code-low-code',
      'cms': 'cms-website',
      'website builder': 'cms-website',
      'storage': 'file-storage',
      'scheduling': 'scheduling',
      'calendar': 'scheduling',
      'ai': 'ai-automation',
      'automation': 'ai-automation',
    };

    for (const [keyword, category] of Object.entries(keywordToCategory)) {
      if (titleLower.includes(keyword)) {
        return normalizeCategory(category);
      }
    }
  }

  return undefined;
}

// Re-export the validator for use in other modules
export { normalizeCategory } from '../validation/category-validator.js';
