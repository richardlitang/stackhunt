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
import { normalizeCategory } from '../../config/taxonomy';
import { ensureParentSuite } from '../utils/suite-manager';
import { updateNormalizedPricing } from '../../pricing/persist';

export interface DatabaseTypes {
  ToolInsert: Record<string, unknown>;
  ContextInsert: Record<string, unknown>;
  ReviewInsert: Record<string, unknown>;
  AffiliateOfferInsert: Record<string, unknown>;
}

/**
 * Infer target_market from pricing plans
 * Logic:
 * - Has business/enterprise plans → 'business'
 * - Only individual/free plans → 'consumer'
 * - Has both individual AND team/business → 'prosumer'
 */
function inferTargetMarket(plans: any[]): 'consumer' | 'prosumer' | 'business' | 'enterprise' {
  if (!plans || plans.length === 0) return 'business'; // Default for tools without pricing

  const audiences = plans.map(p => p.target_audience).filter(Boolean);

  const hasEnterprise = audiences.includes('enterprise');
  const hasBusiness = audiences.includes('business');
  const hasTeam = audiences.includes('team');
  const hasIndividual = audiences.includes('individual');

  // Enterprise-focused tools
  if (hasEnterprise && !hasIndividual) return 'enterprise';

  // Business-focused tools
  if ((hasBusiness || hasEnterprise) && !hasIndividual) return 'business';

  // Prosumer tools (serve both individuals and businesses)
  if (hasIndividual && (hasTeam || hasBusiness || hasEnterprise)) return 'prosumer';

  // Consumer-only tools
  if (hasIndividual && !hasTeam && !hasBusiness && !hasEnterprise) return 'consumer';

  // Default to business if unclear
  return 'business';
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
  if (!ctx.research) {
    throw new Error('[Phase 3] Cannot persist without research data');
  }

  if (ctx.huntType === 'price_only') {
    return await updatePricingOnly(ctx, deps);
  }

  if (!ctx.analysis) {
    throw new Error('[Phase 3] Cannot persist without analysis data');
  }

  deps.log(`[Phase 3: Persistence] Starting for: ${ctx.toolName}`);

  const toolSlug = slugify(ctx.toolName);

  // Step 1: Find category (auto-map from taxonomy or use explicit categorySlug)
  let categoryId: string | null = null;
  const analysis = ctx.analysis.analysis;
  const knowledgeCard = ctx.research.knowledgeCard;

  if (ctx.categorySlug) {
    // Legacy: explicit category slug provided
    const { data: cat } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('slug', ctx.categorySlug)
      .single();
    categoryId = cat?.id || null;
  } else if (knowledgeCard?.smp_taxonomy?.primary_function) {
    // Auto-map from extracted taxonomy
    const primaryFunction = knowledgeCard.smp_taxonomy.primary_function;
    deps.log(`[Category] Auto-mapping from taxonomy: "${primaryFunction}"`);

    // Map primary_function to category slug
    const funcToCategory: Record<string, string> = {
      'Project Management': 'project-management',
      'Communication': 'communication',
      'Notetaking': 'notetaking',
      'Note-Taking': 'notetaking',
      'Developer Tools': 'developer-tools',
      'Code Editor': 'developer-tools',
      'Development': 'developer-tools',
      'Design': 'design',
      'CRM': 'crm-sales',
      'Collaboration': 'collaboration',
      'Productivity': 'productivity',
      'AI & Automation': 'ai-automation',
      'AI Code Assistant': 'ai-automation',
      'AI Tools': 'ai-automation',
      'AI Audio Platform': 'ai-automation',
      'Analytics': 'seo-analytics',
      'SEO': 'seo-analytics',
      'SEO Tools': 'seo-analytics',
      'Email Marketing': 'email-marketing',
      'Social Media': 'social-media',
      'Customer Support': 'customer-support',
      'HR': 'hr-recruiting',
      'HR & Payroll': 'hr-recruiting',
      'Accounting': 'accounting',
      'Accounting Software': 'accounting',
      'Finance': 'accounting',
      'Spend Management': 'accounting',
      'Business Banking': 'payments',
      'Payments': 'payments',
      'Video Editing': 'video-editing',
      'Practice Management': 'healthcare',
      'Dental Practice Management': 'healthcare',
      'Automation': 'ai-automation',
      'Website Builder': 'no-code',
    };

    const categorySlug = funcToCategory[primaryFunction];
    if (categorySlug) {
      const { data: cat } = await deps.supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .eq('type', 'function')
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
        deps.log(`[Category] Mapped "${primaryFunction}" → ${categorySlug}`);
      } else {
        deps.log(`[Category] Warning: No category found for slug "${categorySlug}"`);
      }
    } else {
      deps.log(`[Category] Warning: No mapping for "${primaryFunction}"`);
    }
  }

  // Step 2: Upsert Item (with Knowledge Card + V2 fields)

  // Build V2/V3 specs from analysis + Knowledge Card
  const specs: Record<string, unknown> = {
    pricing_model: analysis.pricingType,
    platforms: analysis.graphTags?.platforms || [],
    integrations: knowledgeCard?.integrations || [],
  };

  // V3: Add SMP pricing data if extracted
  if (knowledgeCard?.smp_pricing) {
    specs.pricing_data = knowledgeCard.smp_pricing;
  }

  // V3: Add SMP taxonomy data if extracted (with normalization)
  if (knowledgeCard?.smp_taxonomy) {
    const rawFunction = knowledgeCard.smp_taxonomy.primary_function;
    const canonicalFunction = normalizeCategory(rawFunction);

    specs.taxonomy = {
      ...knowledgeCard.smp_taxonomy,
      primary_function: canonicalFunction,
    };

    // Preserve original label if normalized (for display purposes)
    if (canonicalFunction !== rawFunction) {
      specs.taxonomy.original_function = rawFunction;
      deps.log(`[Taxonomy] Normalized: "${rawFunction}" → "${canonicalFunction}"`);
    }
  }

  // V3: Add SMP portability data if extracted
  if (knowledgeCard?.smp_portability) {
    specs.portability = knowledgeCard.smp_portability;
  }

  // V4: Add constraints if extracted
  if (knowledgeCard?.constraints) {
    const constraints = knowledgeCard.constraints;

    // Resolve plan_name_match to plan_id
    if (constraints.hard_limits && knowledgeCard.smp_pricing?.plans) {
      const plans = knowledgeCard.smp_pricing.plans;
      const { resolvePlanId } = await import('@/lib/pricing/constraints.js');

      constraints.hard_limits = constraints.hard_limits.map(limit => {
        const planId = resolvePlanId(limit.plan_name_match, plans);

        // Sanitize source_url or fall back to pricing_page_url
        let sourceUrl = limit.source_url;
        if (!sourceUrl || sourceUrl.includes('undefined')) {
          sourceUrl = knowledgeCard.smp_pricing?.pricing_page_url || knowledgeCard.website_url;
        }

        return {
          ...limit,
          plan_id: planId,  // Resolved ID
          source_url: sourceUrl,
        };
      });
    }

    specs.constraints = constraints;
    deps.log(`[Persisted] Constraints: ${constraints.hard_limits?.length || 0} limits, ${constraints.hidden_costs?.length || 0} hidden costs`);
  }

  // V4: Smart Schema - Add category-specific extracted data
  if (analysis.categorySpecificData && Object.keys(analysis.categorySpecificData).length > 0) {
    specs.categorySpecificData = analysis.categorySpecificData;
    deps.log(`[Smart Schema] Saved ${Object.keys(analysis.categorySpecificData).length} category-specific fields`);
  }

  // V4: Tool Hints - Add VIP tool-specific data
  if (analysis.specifics && Object.keys(analysis.specifics).length > 0) {
    specs.specifics = analysis.specifics;
    deps.log(`[Tool Hints] Saved ${Object.keys(analysis.specifics).length} VIP-specific fields`);
  }

  // V4: Add pros/cons to item (not just contextual reviews)
  // This ensures every tool has pros/cons regardless of context
  if (analysis.pros?.length || analysis.cons?.length) {
    const sources = ctx.research.scoutResult.sources;

    // Normalize pros with source attribution
    const normalizedPros = (analysis.pros || []).map((claim: string | ClaimWithSource) =>
      normalizeClaim(claim, sources, analysis.websiteUrl)
    );

    // Normalize cons with source attribution and guardrail
    const rawNormalizedCons = (analysis.cons || []).map((claim: string | ClaimWithSource) =>
      normalizeClaim(claim, sources, analysis.websiteUrl)
    );

    // Apply negative sentiment guardrail to cons
    const validCons: ClaimWithSource[] = [];
    for (const con of rawNormalizedCons) {
      const validation = validateNegativeClaim(con, sources);
      if (validation.isValid) {
        validCons.push(con);
      } else {
        deps.log(`[Item Guardrail] Filtered: "${con.text.substring(0, 40)}..." - insufficient sources`);
      }
    }

    specs.pros = normalizedPros;
    specs.cons = validCons;
    deps.log(`[Item Content] Saved ${normalizedPros.length} pros, ${validCons.length} cons`);
  }

  // Build V2 metadata (Knowledge Card + extended fields)
  const metadata: Record<string, unknown> = {
    ...knowledgeCard,
    // Space for company info and competitors to be added later
  };

  // Calculate data_confidence from Knowledge Card's data_quality
  // high=0.9, medium=0.7, low=0.5
  const dataConfidenceMap: Record<string, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };
  const dataConfidence = dataConfidenceMap[knowledgeCard?.meta?.data_quality || 'low'] || 0.5;

  // Step 2.5: Handle suite bundling (parent/child relationship)
  let parentId: string | null = null;
  const bundledIn = knowledgeCard?.smp_pricing?.bundled_in;

  if (bundledIn) {
    deps.log(`[Suite] Tool is bundled in: ${bundledIn}`);
    try {
      parentId = await ensureParentSuite(deps.supabase, bundledIn);
      deps.log(`[Suite] Linked to parent suite (ID: ${parentId})`);
    } catch (error) {
      deps.log(`[Suite] Warning: Failed to link to parent suite: ${error}`);
      // Continue without parent link - non-fatal error
    }
  }

  const itemData: Record<string, unknown> = {
    name: ctx.toolName,
    slug: toolSlug,
    website: analysis.websiteUrl || null,
    logo_path: ctx.analysis.logo?.path || null,
    logo_url: ctx.analysis.logo?.url || null,
    short_description: analysis.shortDescription || null,
    category_id: categoryId,
    pricing_type: analysis.pricingType,
    embedding: ctx.analysis.embedding,
    // V2: Enhanced fields
    metadata,
    specs,
    verdict: analysis.verdict || null, // One-line conclusion if provided
    // Video data from research
    video_id: ctx.research.video?.videoId || null,
    video_title: ctx.research.video?.title || null,
    // Migration 022: New fields
    data_confidence: dataConfidence,
    learning_curve: knowledgeCard?.learning_curve || null,
    // Migration 025: SMP pricing verification
    pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
    pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
    // V3.1: Review Context (The "Human Touch" Layer)
    review_context: analysis.reviewContext || null,
    // V3.2: Parent/Child Relationship (Suite Bundling)
    parent_id: parentId,
    // Infer target_market from pricing plans
    target_market: inferTargetMarket(knowledgeCard?.smp_pricing?.plans || []),
  };

  const { data: item, error: itemError } = await deps.supabase
    .from('items')
    .upsert(itemData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (itemError) throw new Error(`Failed to save item: ${itemError.message}`);

  deps.log(`Item saved: ${ctx.toolName} (id: ${item.id})`);

  // Update normalized pricing columns (for apples-to-apples comparison)
  const pricingResult = await updateNormalizedPricing(deps.supabase, item.id, specs);
  if (pricingResult.success) {
    deps.log(`✓ Normalized pricing computed`);
  } else {
    deps.log(`⚠️  Failed to compute normalized pricing: ${pricingResult.error}`);
  }

  // Log persisted SMP data for QA
  if (specs.pricing_data) {
    const pd = specs.pricing_data as Record<string, unknown>;
    deps.log(`[Persisted] SMP Pricing: model=${pd.model}, confidence=${pd.confidence}, plans=${(pd.plans as unknown[])?.length || 0}`);
  }
  if (specs.taxonomy) {
    deps.log(`[Persisted] SMP Taxonomy: saved`);
  }
  if (specs.portability) {
    deps.log(`[Persisted] SMP Portability: saved`);
  }
  if (specs.categorySpecificData) {
    const fields = Object.keys(specs.categorySpecificData as Record<string, unknown>);
    deps.log(`[Persisted] Category Data: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`);
  }
  if (specs.specifics) {
    const fields = Object.keys(specs.specifics as Record<string, unknown>);
    deps.log(`[Persisted] VIP Specifics: ${fields.join(', ')}`);
  }

  // Log persisted Review Context (V3.1: Human Touch Layer)
  if (analysis.reviewContext) {
    const rc = analysis.reviewContext;
    if (rc.humanVerdict) {
      deps.log(`[Persisted] Human Verdict: "${rc.humanVerdict}"`);
    }
    if (rc.budgetAnalyst) {
      const ba = rc.budgetAnalyst;
      deps.log(`[Persisted] Budget Analyst: ${ba.costDrivers.length} cost drivers, ${ba.oneTimeFees.length} one-time fees`);
    }
    if (rc.userAdvocate) {
      const ua = rc.userAdvocate;
      deps.log(`[Persisted] User Advocate: vibe="${ua.vibe || 'none'}", ${ua.idealFor.length} ideal-for, ${ua.avoidIf.length} avoid-if`);
      if (ua.powerTip) {
        deps.log(`[Persisted] Power Tip: "${ua.powerTip}"`);
      }
    }
  }

  // Step 3: Create Knowledge Graph links
  await createGraphLinks(item.id, ctx.analysis.analysis.graphTags, deps);

  // Step 4: Create default affiliate offer
  if (analysis.websiteUrl) {
    const offerData: Record<string, unknown> = {
      item_id: item.id,
      url: analysis.websiteUrl,
      cta_text: 'Visit Website',
      is_affiliate: false,
      is_primary: true,
    };

    await deps.supabase.from('affiliate_offers').upsert(offerData, {
      onConflict: 'item_id,is_primary',
      ignoreDuplicates: true,
    });
  }

  // Step 5: If no context, create a general/discovery review
  if (!ctx.contextTitle) {
    deps.log('[Discovery Hunt] Creating general review (no context)');

    // Extract sources from pros/cons
    const allClaims = [...normalizedPros, ...validCons];
    const sources = allClaims
      .filter(claim => claim.source_url)
      .map(claim => ({
        url: claim.source_url,
        type: claim.source_type,
      }));

    // Deduplicate sources
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.url, s])).values()
    );

    // Auto-publish if high quality and robust sources
    const dataQuality = knowledgeCard?.meta?.data_quality || 'medium';
    const shouldAutoPublish = dataQuality === 'high' && uniqueSources.length >= 2;
    const reviewStatus = shouldAutoPublish ? 'published' : 'draft';

    deps.log(`[Discovery Review] Quality: ${dataQuality}, Sources: ${uniqueSources.length}, Status: ${reviewStatus}`);

    // Create review with null context (discovery review)
    const { data: review, error: reviewError } = await deps.supabase
      .from('reviews')
      .insert({
        item_id: item.id,
        context_id: null, // Discovery review
        score: ctx.analysis.analysis?.score || null,
        pros: normalizedPros,
        cons: validCons,
        sources: uniqueSources,
        quality: dataQuality,
        status: reviewStatus,
      })
      .select('id')
      .single();

    if (reviewError) {
      deps.log(`[Discovery Review] Warning: Failed to create review: ${reviewError.message}`);
    } else {
      deps.log(`[Discovery Review] Created: ${review.id} (${reviewStatus})`);
    }

    deps.log('[Phase 3] Complete - Discovery review created');
    return {
      toolId: item.id,
      contextId: null,
      reviewId: review?.id || null,
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

  // Step 7: Create Review (links item to context)
  const reviewId = await createReview(
    item.id,
    contextId,
    ctx.analysis.analysis,
    ctx.research.scoutResult.sources,
    ctx.research.knowledgeCard,
    deps
  );

  deps.log(`Review created: ${reviewId}`);
  deps.log(`[Phase 3] Complete`);

  return {
    toolId: item.id, // Keep as toolId for backward compat in return type
    contextId,
    reviewId,
    wasReused,
  };
}

async function updatePricingOnly(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  deps.log(`[Phase 3: Persistence] price_only update for: ${ctx.toolName}`);

  const toolSlug = slugify(ctx.toolName);
  const knowledgeCard = ctx.research!.knowledgeCard;

  const { data: existingBySlug } = await deps.supabase
    .from('items')
    .select('id, specs')
    .eq('slug', toolSlug)
    .maybeSingle();

  let itemId = existingBySlug?.id as string | undefined;
  let specs = (existingBySlug?.specs as Record<string, unknown>) || {};

  if (!itemId) {
    const { data: existingByName } = await deps.supabase
      .from('items')
      .select('id, specs')
      .ilike('name', ctx.toolName)
      .limit(1)
      .maybeSingle();

    itemId = existingByName?.id as string | undefined;
    specs = (existingByName?.specs as Record<string, unknown>) || specs;
  }

  if (!itemId) {
    throw new Error(`[price_only] No existing item found for ${ctx.toolName}`);
  }

  if (knowledgeCard?.smp_pricing) {
    specs = { ...specs, pricing_data: knowledgeCard.smp_pricing };
  }

  let parentId: string | null = null;
  const bundledIn = knowledgeCard?.smp_pricing?.bundled_in;
  if (bundledIn) {
    try {
      parentId = await ensureParentSuite(deps.supabase, bundledIn);
      deps.log(`[Suite] Linked to parent suite (ID: ${parentId})`);
    } catch (error) {
      deps.log(`[Suite] Warning: Failed to link to parent suite: ${error}`);
    }
  }

  const { data: updated, error } = await deps.supabase
    .from('items')
    .update({
      specs,
      pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
      pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
      parent_id: parentId,
    })
    .eq('id', itemId)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to update pricing: ${error.message}`);

  deps.log(`[price_only] Pricing updated for item ${updated.id}`);

  return {
    toolId: updated.id,
    contextId: null,
    reviewId: null,
    wasReused: true,
  };
}

/**
 * Create Knowledge Graph links for an item
 */
async function createGraphLinks(
  itemId: string,
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
    await deps.supabase.rpc('link_item_to_category', {
      p_item_id: itemId,
      p_category_name: fn,
      p_category_type: 'function',
    });
  }

  // Link audiences
  for (const aud of graphTags.audiences) {
    await deps.supabase.rpc('link_item_to_category', {
      p_item_id: itemId,
      p_category_name: aud,
      p_category_type: 'audience',
    });
  }

  // Link platforms
  for (const plat of graphTags.platforms) {
    await deps.supabase.rpc('link_item_to_category', {
      p_item_id: itemId,
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
 * Create a review linking item to context
 *
 * Includes full source attribution for legal protection:
 * - Normalizes all claims to include source_url, source_type, claim_type
 * - Applies negative sentiment guardrail (2+ sources for negative opinions)
 * - Stores research sources for audit trail
 * - Records generation timestamp
 * - Auto-publishes if high confidence (quality="high", score 70+, minimal filtered claims)
 */
async function createReview(
  itemId: string,
  contextId: string,
  analysis: any,
  sources: Array<{ url: string; title: string; snippet: string; domain: string }>,
  knowledgeCard: any,
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
    item_id: itemId, // V2: renamed from tool_id
    context_id: contextId,
    score: analysis.score,
    summary_markdown: analysis.summary,
    pros: normalizedPros,
    cons: normalizedCons,
    sentiment_tags: analysis.sentimentTags,
    // Migration 022: Context-specific review fields
    fit_score: analysis.fitScore || null,
    value_rating: analysis.valueRating || null,
    standout_features: analysis.standoutFeatures || [],
    dealbreakers: analysis.dealbreakers || [],
    switching_from: analysis.switchingFrom || [],
  };

  // Add sources if provided (for audit trail)
  if (sources && sources.length > 0) {
    reviewData.sources = sources;
  }

  // AUTO-PUBLISH LOGIC: High-confidence reviews go live immediately
  // Criteria:
  // 1. High data quality (verified facts from official sources)
  // 2. Good score (70+)
  // 3. Minimal legal risk (≤1 filtered con, ≥2 valid cons remaining)
  const isHighConfidence =
    knowledgeCard.meta.data_quality === 'high' &&
    analysis.score >= 70 &&
    filteredCons.length <= 1 &&
    normalizedCons.length >= 2;

  if (isHighConfidence && deps.config.isDraftMode !== false) {
    reviewData.status = 'published';
    deps.log(`[Auto-publish] High confidence review (quality=${knowledgeCard.meta.data_quality}, score=${analysis.score}, ${filteredCons.length} filtered, ${normalizedCons.length} valid cons)`);
  } else if (deps.config.isDraftMode) {
    reviewData.status = 'draft';
    if (!isHighConfidence) {
      deps.log(`[Draft] Review needs manual review (quality=${knowledgeCard.meta.data_quality}, score=${analysis.score}, ${filteredCons.length} filtered, ${normalizedCons.length} valid cons)`);
    }
  }

  const { data: review, error: reviewError } = await deps.supabase
    .from('reviews')
    .upsert(reviewData, { onConflict: 'item_id,context_id' })
    .select('id')
    .single();

  if (reviewError) throw new Error(`Failed to save review: ${reviewError.message}`);

  return review.id;
}
