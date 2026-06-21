#!/usr/bin/env node --import tsx

import 'dotenv/config';
import { supabaseAdmin } from '../src/lib/supabase';

const QUERY_LIMIT = 5_000;

interface ToolScoreRow {
  id: string;
  base_score: number | null;
}

interface PublishedReviewScoreRow {
  item_id: string;
  score: number | null;
}

function percentage(numerator: number, denominator: number): string {
  if (denominator === 0) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the score coverage audit');
  }

  const [toolsResult, reviewsResult] = await Promise.all([
    supabaseAdmin.from('items').select('id, base_score').eq('type', 'tool').limit(QUERY_LIMIT),
    supabaseAdmin
      .from('reviews')
      .select('item_id, score')
      .eq('status', 'published')
      .limit(QUERY_LIMIT),
  ]);

  if (toolsResult.error) throw toolsResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  const tools = (toolsResult.data || []) as ToolScoreRow[];
  const publishedReviews = (reviewsResult.data || []) as PublishedReviewScoreRow[];
  const toolIds = new Set(tools.map((tool) => tool.id));
  const publishedToolIds = new Set(
    publishedReviews.filter((review) => toolIds.has(review.item_id)).map((review) => review.item_id)
  );
  const publishedToolIdsWithReviewScore = new Set(
    publishedReviews
      .filter((review) => toolIds.has(review.item_id) && review.score !== null)
      .map((review) => review.item_id)
  );
  const toolIdsWithBaseScore = new Set(
    tools.filter((tool) => tool.base_score !== null).map((tool) => tool.id)
  );
  const resolvablePublishedToolIds = new Set(
    [...publishedToolIds].filter(
      (toolId) => toolIdsWithBaseScore.has(toolId) || publishedToolIdsWithReviewScore.has(toolId)
    )
  );
  const resolvableToolIds = new Set([...toolIdsWithBaseScore, ...publishedToolIdsWithReviewScore]);

  console.log('Tool score coverage audit');
  console.log(`All tools: ${tools.length}`);
  console.log(`Tools with base_score: ${toolIdsWithBaseScore.size}`);
  console.log(`Tools with a published review: ${publishedToolIds.size}`);
  console.log(
    `Published tools with a scored published review: ${publishedToolIdsWithReviewScore.size}`
  );
  console.log(
    `Published tools with a resolvable score: ${resolvablePublishedToolIds.size}/${publishedToolIds.size} (${percentage(resolvablePublishedToolIds.size, publishedToolIds.size)})`
  );
  console.log(
    `All tools with a resolvable score: ${resolvableToolIds.size}/${tools.length} (${percentage(resolvableToolIds.size, tools.length)})`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Tool score coverage audit failed: ${message}`);
  process.exit(1);
});
