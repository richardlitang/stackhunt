/**
 * Persistence Phase - Dedup + Save + Graph Links
 *
 * Phase 3 of the Hunter pipeline:
 * 1. Check for similar context (deduplication)
 * 2. Save tool to database with Knowledge Card metadata
 * 3. Create Knowledge Graph links (functions, audiences, platforms)
 * 4. Create or reuse context
 * 5. Create review linking tool to context
 *
 * @module hunter/phases/persistence
 */

import type {
  HunterContext,
  HunterDependencies,
  PersistenceOutput,
  ClaimWithSource,
} from '../types';
import { slugify, classifySourceType } from '../utils';

export interface DatabaseTypes {
  ToolInsert: Record<string, unknown>;
  ContextInsert: Record<string, unknown>;
  ReviewInsert: Record<string, unknown>;
  AffiliateOfferInsert: Record<string, unknown>;
}

/**
 * Execute the Persistence Phase
 *
 * Saves all data to database with deduplication and graph linking.
 * Skipped if ctx.skipPersistence is true.
 *
 * @param ctx - Hunter context with research and analysis data
 * @param deps - Injected dependencies
 * @returns Persistence output with IDs of created entities
 */
export async function executePersistencePhase(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  if (!ctx.research || !ctx.analysis) {
    throw new Error('[Phase 3] Cannot persist without research and analysis data');
  }

  deps.log(`[Phase 3: Persistence] Starting for: ${ctx.toolName}`);

  const toolSlug = slugify(ctx.toolName);

  // Step 1: Find legacy category (backwards compatibility)
  let categoryId: string | null = null;
  if (ctx.categorySlug) {
    const { data: cat } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('slug', ctx.categorySlug)
      .single();
    categoryId = cat?.id || null;
  }

  // Step 2: Upsert Tool (with Knowledge Card as metadata)
  const toolData: Record<string, unknown> = {
    name: ctx.toolName,
    slug: toolSlug,
    website: ctx.analysis.analysis.websiteUrl || null,
    logo_path: ctx.analysis.logo?.path || null,
    logo_url: ctx.analysis.logo?.url || null,
    short_description: ctx.analysis.analysis.shortDescription || null,
    category_id: categoryId,
    pricing_type: ctx.analysis.analysis.pricingType,
    embedding: ctx.analysis.embedding,
    // Store Knowledge Card for comparison tables
    metadata: ctx.research.knowledgeCard || null,
  };

  const { data: tool, error: toolError } = await deps.supabase
    .from('tools')
    .upsert(toolData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (toolError) throw new Error(`Failed to save tool: ${toolError.message}`);

  deps.log(`Tool saved: ${ctx.toolName} (id: ${tool.id})`);

  // Step 3: Create Knowledge Graph links
  await createGraphLinks(tool.id, ctx.analysis.analysis.graphTags, deps);

  // Step 4: Create default affiliate offer
  if (ctx.analysis.analysis.websiteUrl) {
    const offerData: Record<string, unknown> = {
      tool_id: tool.id,
      url: ctx.analysis.analysis.websiteUrl,
      cta_text: 'Visit Website',
      is_affiliate: false,
      is_primary: true,
    };

    await deps.supabase.from('affiliate_offers').upsert(offerData, {
      onConflict: 'tool_id,is_primary',
      ignoreDuplicates: true,
    });
  }

  // Step 5: If no context, we're done
  if (!ctx.contextTitle) {
    deps.log('[Phase 3] Complete - No context provided');
    return {
      toolId: tool.id,
      contextId: null,
      reviewId: null,
      wasReused: false,
    };
  }

  // Step 6: Check for similar context (deduplication)
  const similarContext = await findSimilarContext(ctx.contextTitle, deps);
  let contextId: string;
  let wasReused = false;

  if (similarContext) {
    deps.log(`Reusing existing context: "${similarContext.title}"`);
    contextId = similarContext.id;
    wasReused = true;
  } else {
    // Create new context
    contextId = await createNewContext(
      ctx.contextTitle,
      ctx.analysis.analysis,
      categoryId,
      deps
    );
    deps.log(`Created new context: ${ctx.contextTitle} (id: ${contextId})`);
  }

  // Step 7: Create Review (links tool to context)
  const reviewId = await createReview(
    tool.id,
    contextId,
    ctx.analysis.analysis,
    ctx.research.scoutResult.sources,
    deps
  );

  deps.log(`Review created: ${reviewId}`);
  deps.log(`[Phase 3] Complete`);

  return {
    toolId: tool.id,
    contextId,
    reviewId,
    wasReused,
  };
}

/**
 * Create Knowledge Graph links for a tool
 */
async function createGraphLinks(
  toolId: string,
  graphTags: {
    functions: string[];
    audiences: string[];
    platforms: string[];
  },
  deps: HunterDependencies
): Promise<void> {
  deps.log('Creating Knowledge Graph links...');

  // Link functions
  for (const fn of graphTags.functions) {
    await deps.supabase.rpc('link_tool_to_category', {
      p_tool_id: toolId,
      p_category_name: fn,
      p_category_type: 'function',
    });
  }

  // Link audiences
  for (const aud of graphTags.audiences) {
    await deps.supabase.rpc('link_tool_to_category', {
      p_tool_id: toolId,
      p_category_name: aud,
      p_category_type: 'audience',
    });
  }

  // Link platforms
  for (const plat of graphTags.platforms) {
    await deps.supabase.rpc('link_tool_to_category', {
      p_tool_id: toolId,
      p_category_name: plat,
      p_category_type: 'platform',
    });
  }

  deps.log(`Linked ${graphTags.functions.length} functions, ${graphTags.audiences.length} audiences, ${graphTags.platforms.length} platforms`);
}

/**
 * Find similar context using Jaccard similarity
 */
async function findSimilarContext(
  contextTitle: string,
  deps: HunterDependencies,
  threshold = 0.9
): Promise<{ id: string; title: string } | null> {
  deps.log(`Checking for similar contexts: "${contextTitle}"`);

  const { data: contexts } = await deps.supabase.from('contexts').select('id, title, slug');

  if (!contexts || contexts.length === 0) return null;

  const normalize = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const newWords = new Set(normalize(contextTitle).split(' '));

  for (const ctx of contexts) {
    const existingWords = new Set(normalize(ctx.title).split(' '));
    const intersection = new Set([...newWords].filter((w) => existingWords.has(w)));
    const union = new Set([...newWords, ...existingWords]);
    const similarity = intersection.size / union.size;

    if (similarity >= threshold) {
      deps.log(`Found similar context: "${ctx.title}" (${(similarity * 100).toFixed(1)}% match)`);
      return { id: ctx.id, title: ctx.title };
    }
  }

  return null;
}

/**
 * Create a new context
 */
async function createNewContext(
  contextTitle: string,
  analysis: any,
  categoryId: string | null,
  deps: HunterDependencies
): Promise<string> {
  // Remove "best" prefix from slug since route is already /best/
  let contextSlug = slugify(contextTitle);
  if (contextSlug.startsWith('best-')) {
    contextSlug = contextSlug.replace(/^best-/, '');
  }

  // Get category IDs for context graph relationships
  let functionCategoryId: string | null = null;
  let audienceCategoryId: string | null = null;

  if (analysis.graphTags.functions.length > 0) {
    const { data } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('type', 'function')
      .ilike('name', analysis.graphTags.functions[0])
      .single();
    functionCategoryId = data?.id || null;
  }

  if (analysis.graphTags.audiences.length > 0) {
    const { data } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('type', 'audience')
      .ilike('name', analysis.graphTags.audiences[0])
      .single();
    audienceCategoryId = data?.id || null;
  }

  // Build structured title parts
  const titleParts = analysis.titleParts || {
    noun: contextTitle.replace(/^best\s+/i, '').replace(/\s+for\s+.*$/i, ''),
    modifier: contextTitle.match(/for\s+(.+)$/i)?.[1] ? `for ${contextTitle.match(/for\s+(.+)$/i)![1]}` : undefined,
  };

  const contextData = {
    title: contextTitle,
    slug: contextSlug,
    category_id: categoryId,
    title_template: 'best' as const,
    title_noun: titleParts.noun,
    title_modifier: titleParts.modifier || null,
    function_category_id: functionCategoryId,
    audience_category_id: audienceCategoryId,
  };

  const { data: context, error: contextError } = await deps.supabase
    .from('contexts')
    .upsert(contextData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (contextError) throw new Error(`Failed to save context: ${contextError.message}`);

  return context.id;
}

/**
 * Normalize a claim to ensure consistent format with source attribution
 *
 * Handles both legacy string claims and new enriched ClaimWithSource objects.
 * For legacy strings, attempts to find a matching source from the research.
 * Always adds a retrieved_at timestamp for time-bound defense.
 */
function normalizeClaim(
  claim: string | ClaimWithSource,
  sources: Array<{ url: string; title: string; snippet: string; domain: string }>,
  toolWebsite?: string
): ClaimWithSource {
  // Current timestamp for time-bound defense
  const retrievedAt = new Date().toISOString();

  // Already enriched - validate and return with timestamp
  if (typeof claim === 'object' && 'text' in claim && 'source_url' in claim) {
    return {
      text: claim.text,
      source_url: claim.source_url,
      source_type: claim.source_type || classifySourceType(claim.source_url, toolWebsite),
      claim_type: claim.claim_type || 'opinion', // Default to opinion for safety
      retrieved_at: claim.retrieved_at || retrievedAt,
    };
  }

  // Legacy string - try to find a relevant source
  const claimText = typeof claim === 'string' ? claim : claim.text;

  // Try to match claim keywords to source snippets
  const claimWords = claimText.toLowerCase().split(/\s+/);
  let bestSource = sources[0]; // Fallback to first source
  let bestMatchScore = 0;

  for (const source of sources) {
    const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
    let matchScore = 0;
    for (const word of claimWords) {
      if (word.length > 3 && sourceText.includes(word)) {
        matchScore++;
      }
    }
    if (matchScore > bestMatchScore) {
      bestMatchScore = matchScore;
      bestSource = source;
    }
  }

  return {
    text: claimText,
    source_url: bestSource?.url || 'https://unknown-source',
    source_type: bestSource ? classifySourceType(bestSource.url, toolWebsite) : 'community',
    claim_type: 'opinion', // Assume opinion for legacy claims (safer)
    retrieved_at: retrievedAt,
  };
}

/**
 * Negative Sentiment Guardrail
 *
 * For legal protection, negative opinion claims require corroboration from 2+ sources.
 * This prevents single-source defamatory claims from being published.
 *
 * @param claim - The normalized claim
 * @param allSources - All research sources to check for corroboration
 * @returns Object with isValid flag and optional warning
 */
function validateNegativeClaim(
  claim: ClaimWithSource,
  allSources: Array<{ url: string; title: string; snippet: string; domain: string }>
): { isValid: boolean; warning?: string; corroboratingSourceCount: number } {
  // Only apply guardrail to negative opinions from community sources
  // Facts from official sources don't need this check
  if (claim.claim_type === 'fact' && claim.source_type === 'official') {
    return { isValid: true, corroboratingSourceCount: 1 };
  }

  // For opinions (especially from community), count corroborating sources
  const claimWords = claim.text.toLowerCase().split(/\s+/).filter(w => w.length > 4);

  let corroboratingCount = 0;
  const matchedDomains = new Set<string>();

  for (const source of allSources) {
    const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
    // Count how many significant claim words appear in this source
    const matchingWords = claimWords.filter(w => sourceText.includes(w));

    // If 40%+ of claim words match, this source corroborates
    if (matchingWords.length >= claimWords.length * 0.4) {
      // Don't count multiple pages from same domain as separate corroboration
      if (!matchedDomains.has(source.domain)) {
        matchedDomains.add(source.domain);
        corroboratingCount++;
      }
    }
  }

  // Require 2+ independent sources for community-sourced opinions
  if (claim.source_type === 'community' && claim.claim_type === 'opinion') {
    if (corroboratingCount < 2) {
      return {
        isValid: false,
        warning: `Negative opinion only corroborated by ${corroboratingCount} source(s). Requires 2+ for legal protection.`,
        corroboratingSourceCount: corroboratingCount,
      };
    }
  }

  // Editorial sources get slightly more trust, but still flag single-source opinions
  if (claim.source_type === 'editorial' && claim.claim_type === 'opinion') {
    if (corroboratingCount < 1) {
      return {
        isValid: false,
        warning: `Editorial opinion has no corroborating sources.`,
        corroboratingSourceCount: corroboratingCount,
      };
    }
  }

  return { isValid: true, corroboratingSourceCount: corroboratingCount };
}

/**
 * Create a review linking tool to context
 *
 * Includes full source attribution for legal protection:
 * - Normalizes all claims to include source_url, source_type, claim_type
 * - Applies negative sentiment guardrail (2+ sources for negative opinions)
 * - Stores research sources for audit trail
 * - Records generation timestamp
 */
async function createReview(
  toolId: string,
  contextId: string,
  analysis: any,
  sources: Array<{ url: string; title: string; snippet: string; domain: string }>,
  deps: HunterDependencies
): Promise<string> {
  // Normalize pros and cons with source attribution
  const normalizedPros = analysis.pros.map((claim: string | ClaimWithSource) =>
    normalizeClaim(claim, sources, analysis.websiteUrl)
  );
  const rawNormalizedCons = analysis.cons.map((claim: string | ClaimWithSource) =>
    normalizeClaim(claim, sources, analysis.websiteUrl)
  );

  // Apply negative sentiment guardrail to cons
  // Filter out cons that don't meet the 2+ source requirement for opinions
  const normalizedCons: ClaimWithSource[] = [];
  const filteredCons: Array<{ claim: ClaimWithSource; reason: string }> = [];

  for (const con of rawNormalizedCons) {
    const validation = validateNegativeClaim(con, sources);
    if (validation.isValid) {
      normalizedCons.push(con);
    } else {
      filteredCons.push({ claim: con, reason: validation.warning || 'Failed validation' });
      deps.log(`[Guardrail] Filtered con: "${con.text.substring(0, 50)}..." - ${validation.warning}`);
    }
  }

  // Log if any cons were filtered
  if (filteredCons.length > 0) {
    deps.log(`[Guardrail] Filtered ${filteredCons.length} negative claim(s) due to insufficient source corroboration`);
  }

  const reviewData: Record<string, unknown> = {
    tool_id: toolId,
    context_id: contextId,
    score: analysis.score,
    summary_markdown: analysis.summary,
    pros: normalizedPros,
    cons: normalizedCons,
    sentiment_tags: analysis.sentimentTags,
  };

  // Add sources if provided (for audit trail)
  if (sources && sources.length > 0) {
    reviewData.sources = sources;
  }

  // DRAFT MODE: Reviews start as drafts
  if (deps.config.isDraftMode) {
    reviewData.status = 'draft';
  }

  const { data: review, error: reviewError } = await deps.supabase
    .from('reviews')
    .upsert(reviewData, { onConflict: 'tool_id,context_id' })
    .select('id')
    .single();

  if (reviewError) throw new Error(`Failed to save review: ${reviewError.message}`);

  return review.id;
}
