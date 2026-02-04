/**
 * Analysis Phase - Synthesize + Embed + Logo
 *
 * Phase 2 of the Hunter pipeline:
 * 1. Synthesize contextual review with Knowledge Graph tags (Pass 2 - The Architect)
 * 2. Generate embedding vector for semantic search
 * 3. Fetch and upload tool logo
 *
 * @module hunter/phases/analysis
 */

import type {
  HunterContext,
  HunterDependencies,
  AnalysisOutput,
} from '../types';
import { buildFactSummary, interpolateTemplate } from '../utils';
import {
  SYNTHESIS_PROMPT,
  buildCategoryExtractionFields,
  getPersonaContext,
  buildAdaptiveSpecificsPrompt,
} from '../services/prompts';
import { getCategoryDefinition } from '../schemas';

/**
 * Execute the Analysis Phase
 *
 * Synthesizes a contextual review, generates embeddings, and fetches logos.
 * Skipped if ctx.skipAnalysis is true (duplicate detected).
 *
 * @param ctx - Hunter context with research data
 * @param deps - Injected dependencies
 * @returns Analysis output with review, embedding, and logo
 */
export async function executeAnalysisPhase(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<AnalysisOutput> {
  if (!ctx.research) {
    throw new Error('[Phase 2] Cannot analyze without research data');
  }

  deps.log(`[Phase 2: Analysis] Starting for: ${ctx.toolName}`);

  // Step 1: Fetch existing categories for Knowledge Graph
  const existingCategories = await getExistingCategories(deps);
  deps.log(`Loaded ${existingCategories.functions.length} functions, ${existingCategories.audiences.length} audiences, ${existingCategories.platforms.length} platforms`);

  // Step 2: Detect category for smart schema extraction
  const categorySlug = detectToolCategory(ctx, deps);
  if (categorySlug) {
    const categoryDef = getCategoryDefinition(categorySlug);
    deps.log(`[Smart Schema] Using category: ${categoryDef?.name || categorySlug}`);
  } else {
    deps.log('[Smart Schema] No category detected, using base schema');
  }

  // Step 3: Build category-specific prompt additions
  const categoryFields = buildCategoryExtractionFields(categorySlug);
  const personaContext = getPersonaContext(categorySlug);

  // Step 4: Build adaptive tool-specific discovery prompt
  const adaptiveSpecificsPrompt = buildAdaptiveSpecificsPrompt();

  // Step 5: Use in-code synthesis prompt with category + adaptive discovery
  const promptTemplate = SYNTHESIS_PROMPT + categoryFields + personaContext + adaptiveSpecificsPrompt;

  // Step 6: Build fact summary from Knowledge Card
  const factSummary = buildFactSummary(ctx.research.knowledgeCard);

  // Step 7: Interpolate prompt variables
  const interpolatedPrompt = interpolateTemplate(promptTemplate, {
    toolName: ctx.toolName,
    contextTitle: ctx.contextTitle || '',
    existingFunctions: existingCategories.functions.join(', ') || 'None yet',
    existingAudiences: existingCategories.audiences.join(', ') || 'None yet',
    existingPlatforms: existingCategories.platforms.join(', ') || 'None yet',
    reviewsSnippets: ctx.research.scoutResult.reviewsSnippets.join('\n'),
    pricingSnippets: ctx.research.scoutResult.pricingSnippets.join('\n'),
    alternativesSnippets: ctx.research.scoutResult.alternativesSnippets.join('\n'),
    budgetAnalystSnippets: ctx.research.scoutResult.budgetAnalystSnippets.join('\n'),
    tribalKnowledgeSnippets: ctx.research.scoutResult.tribalKnowledgeSnippets.join('\n'),
    knowledgeCardFacts: factSummary,
  });

  // Step 8: Synthesize analysis (Pass 2 - The Architect + Human Context Roles)
  const { analysis, tokensUsed: synthesisTokens } = await deps.gemini.synthesize(
    {
      toolName: ctx.toolName,
      contextTitle: ctx.contextTitle,
      reviewsSnippets: ctx.research.scoutResult.reviewsSnippets,
      pricingSnippets: ctx.research.scoutResult.pricingSnippets,
      alternativesSnippets: ctx.research.scoutResult.alternativesSnippets,
      budgetAnalystSnippets: ctx.research.scoutResult.budgetAnalystSnippets,
      tribalKnowledgeSnippets: ctx.research.scoutResult.tribalKnowledgeSnippets,
      knowledgeCardFacts: factSummary,
      existingCategories,
      promptTemplate: interpolatedPrompt,
    },
    deps.withRetry
  );

  // Attach Knowledge Card to analysis
  analysis.knowledgeCard = ctx.research.knowledgeCard;

  deps.log(`[Pass 2] Analysis complete - Score: ${analysis.score}/100`);
  deps.log(`Graph tags: functions=[${analysis.graphTags.functions.join(', ')}], audiences=[${analysis.graphTags.audiences.join(', ')}], platforms=[${analysis.graphTags.platforms.join(', ')}]`);

  // Step 8.5: Validate analysis output
  const { validateAnalysis, formatValidationReport } = await import('../validation/schema-validator.js');
  const analysisValidation = validateAnalysis(analysis);
  deps.log(formatValidationReport(analysisValidation, 'Analysis'));

  // Store analysis validation metrics
  if (ctx.queueItemId) {
    await deps.supabase.rpc('log_metric', {
      p_metric_type: 'analysis_qa_score',
      p_metric_value: analysisValidation.score,
      p_tags: {
        phase: 'analysis',
        tool_name: ctx.toolName,
        is_valid: analysisValidation.isValid,
        score: analysis.score,
        pros_count: analysis.pros.length,
        cons_count: analysis.cons.length,
      },
    });
  }

  // Step 9: Generate embedding for semantic search
  // Use "Functional Anchor" strategy: embed the SPEC not just the VIBE
  // This prevents "semantic smudge" where Slack ≈ HubSpot due to generic B2B language
  const kc = ctx.research.knowledgeCard;
  const taxonomy = kc.smp_taxonomy;
  const features = kc.features;
  const competitive = kc.competitive;

  const embeddingParts = [
    `Tool: ${ctx.toolName}`,
    // Include suite relationship for better semantic search
    kc.smp_pricing?.bundled_in ? `Part of the ${kc.smp_pricing.bundled_in} suite` : '',
    taxonomy?.primary_function ? `Category: ${taxonomy.primary_function}` : '',
    taxonomy?.secondary_functions?.length ? `Also: ${taxonomy.secondary_functions.join(', ')}` : '',
    taxonomy?.likely_departments?.length ? `Department: ${taxonomy.likely_departments.join(', ')}` : '',
    features?.core?.length ? `Core Features: ${features.core.slice(0, 5).join(', ')}` : '',
    features?.unique?.length ? `Unique: ${features.unique.slice(0, 3).join(', ')}` : '',
    competitive?.main_alternatives?.length ? `Alternatives: ${competitive.main_alternatives.slice(0, 3).join(', ')}` : '',
    analysis.graphTags.functions.length ? `Functions: ${analysis.graphTags.functions.join(', ')}` : '',
    analysis.graphTags.audiences.length ? `Audience: ${analysis.graphTags.audiences.join(', ')}` : '',
    `Summary: ${analysis.summary.slice(0, 500)}`, // Truncate summary to leave room for anchors
  ].filter(Boolean).join('\n');

  deps.log(`[Embedding] Anchored text: ${embeddingParts.split('\n').slice(0, 4).join(' | ')}...`);

  const embedding = await deps.gemini.generateEmbedding(
    embeddingParts,
    deps.withRetry
  );
  deps.log(`Embedding generated (${embedding.length} dimensions)`);

  // Step 10: Fetch and upload logo
  const logo = await deps.logo.fetchAndUpload(
    ctx.toolName,
    analysis.websiteUrl || ctx.research.knowledgeCard.website_url || undefined,
    deps.log
  );

  if (logo) {
    deps.log(`Logo uploaded: ${logo.url}`);
  } else {
    deps.log('No logo available');
  }

  deps.log(`[Phase 2] Complete - ${synthesisTokens} tokens used`);

  return {
    analysis,
    embedding,
    logo,
    tokensUsed: synthesisTokens,
  };
}

/**
 * Fetch existing categories for Knowledge Graph tag recommendations
 */
async function getExistingCategories(
  deps: HunterDependencies
): Promise<{
  functions: string[];
  audiences: string[];
  platforms: string[];
}> {
  const { data } = await deps.supabase
    .from('categories')
    .select('name, type')
    .order('name');

  const result = {
    functions: [] as string[],
    audiences: [] as string[],
    platforms: [] as string[],
  };

  for (const cat of data || []) {
    if (cat.type === 'function') result.functions.push(cat.name);
    else if (cat.type === 'audience') result.audiences.push(cat.name);
    else if (cat.type === 'platform') result.platforms.push(cat.name);
  }

  return result;
}

// Prompts are stored in code (no DB access required).

/**
 * Detect tool category from context or knowledge card.
 *
 * Priority:
 * 1. Explicit categorySlug in context
 * 2. Infer from knowledge card taxonomy
 * 3. Match from context title keywords
 */
function detectToolCategory(
  ctx: HunterContext,
  deps: HunterDependencies
): string | undefined {
  // Priority 1: Explicit category from input
  if (ctx.categorySlug) {
    return ctx.categorySlug;
  }

  // Priority 2: Infer from knowledge card taxonomy
  const taxonomy = ctx.research?.knowledgeCard?.smp_taxonomy;
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
      'Automation': 'ai-automation',
    };

    const mapped = functionToCategory[taxonomy.primary_function];
    if (mapped) {
      deps.log(`[Smart Schema] Inferred category from taxonomy: ${taxonomy.primary_function} → ${mapped}`);
      return mapped;
    }
  }

  // Priority 3: Match from context title keywords
  if (ctx.contextTitle) {
    const titleLower = ctx.contextTitle.toLowerCase();
    const keywordToCategory: Record<string, string> = {
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
        deps.log(`[Smart Schema] Inferred category from context title: "${keyword}" → ${category}`);
        return category;
      }
    }
  }

  return undefined;
}
