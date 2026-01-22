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
import { FALLBACK_SYNTHESIS_PROMPT } from '../constants';

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

  // Step 2: Load or use fallback prompt
  let promptTemplate = await getPromptTemplate('hunter_synthesis', deps);
  if (!promptTemplate) {
    deps.log('Using fallback synthesis prompt');
    promptTemplate = FALLBACK_SYNTHESIS_PROMPT;
  }

  // Step 3: Build fact summary from Knowledge Card
  const factSummary = buildFactSummary(ctx.research.knowledgeCard);

  // Step 4: Interpolate prompt variables
  const interpolatedPrompt = interpolateTemplate(promptTemplate, {
    toolName: ctx.toolName,
    contextTitle: ctx.contextTitle || '',
    existingFunctions: existingCategories.functions.join(', ') || 'None yet',
    existingAudiences: existingCategories.audiences.join(', ') || 'None yet',
    existingPlatforms: existingCategories.platforms.join(', ') || 'None yet',
    reviewsSnippets: ctx.research.scoutResult.reviewsSnippets.join('\n'),
    pricingSnippets: ctx.research.scoutResult.pricingSnippets.join('\n'),
    alternativesSnippets: ctx.research.scoutResult.alternativesSnippets.join('\n'),
    knowledgeCardFacts: factSummary,
  });

  // Step 5: Synthesize analysis (Pass 2 - The Architect)
  const { analysis, tokensUsed: synthesisTokens } = await deps.gemini.synthesize(
    {
      toolName: ctx.toolName,
      contextTitle: ctx.contextTitle,
      reviewsSnippets: ctx.research.scoutResult.reviewsSnippets,
      pricingSnippets: ctx.research.scoutResult.pricingSnippets,
      alternativesSnippets: ctx.research.scoutResult.alternativesSnippets,
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

  // Step 6: Generate embedding for semantic search
  const embeddingText = `${ctx.toolName} ${analysis.summary} ${analysis.pros.map(p => typeof p === 'string' ? p : p.text).join(' ')}`;
  const embedding = await deps.gemini.generateEmbedding(
    embeddingText,
    deps.withRetry
  );
  deps.log(`Embedding generated (${embedding.length} dimensions)`);

  // Step 7: Fetch and upload logo
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

/**
 * Load prompt template from database
 */
async function getPromptTemplate(
  key: string,
  deps: HunterDependencies
): Promise<string | null> {
  const { data } = await deps.supabase.rpc('get_prompt', { p_key: key });
  return data?.[0]?.template || null;
}
