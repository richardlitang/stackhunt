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

  // Step 2: Extract structured facts (Pass 1 - The Librarian)
  const { knowledgeCard, tokensUsed } = await deps.gemini.extractKnowledgeCard(
    {
      toolName: ctx.toolName,
      reviewsSnippets: scoutResult.reviewsSnippets,
      pricingSnippets: scoutResult.pricingSnippets,
      alternativesSnippets: scoutResult.alternativesSnippets,
    },
    deps.withRetry
  );

  deps.log(`[Pass 1] Knowledge Card extracted (quality: ${knowledgeCard.meta.data_quality})`);

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
