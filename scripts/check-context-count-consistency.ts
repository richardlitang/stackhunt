import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type CountRow = {
  id: string;
  title: string;
  all_reviews_count: number;
  published_reviews_count: number;
};

type ReviewRow = {
  context_id: string | null;
  status: string;
};

async function fetchAllReviews(): Promise<ReviewRow[]> {
  const batchSize = 1000;
  let from = 0;
  const reviews: ReviewRow[] = [];

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from('reviews')
      .select('context_id, status')
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;
    reviews.push(...(data as ReviewRow[]));
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return reviews;
}

async function main() {
  const { data: contexts, error: contextError } = await supabase
    .from('contexts')
    .select('id, title, all_reviews_count, published_reviews_count')
    .limit(5000);

  if (contextError) {
    console.error('[Check] Failed to load contexts:', contextError.message);
    process.exit(1);
  }

  const reviews = await fetchAllReviews();
  const expected = new Map<string, { all: number; published: number }>();

  for (const review of reviews) {
    if (!review.context_id) continue;
    const current = expected.get(review.context_id) || { all: 0, published: 0 };
    current.all += 1;
    if (review.status === 'published') current.published += 1;
    expected.set(review.context_id, current);
  }

  const mismatches: Array<{
    id: string;
    title: string;
    actualAll: number;
    expectedAll: number;
    actualPublished: number;
    expectedPublished: number;
  }> = [];

  for (const context of (contexts || []) as CountRow[]) {
    const exp = expected.get(context.id) || { all: 0, published: 0 };
    if (
      context.all_reviews_count !== exp.all ||
      context.published_reviews_count !== exp.published
    ) {
      mismatches.push({
        id: context.id,
        title: context.title,
        actualAll: context.all_reviews_count,
        expectedAll: exp.all,
        actualPublished: context.published_reviews_count,
        expectedPublished: exp.published,
      });
    }
  }

  if (mismatches.length === 0) {
    console.log('[Check] Context count semantics are consistent.');
    return;
  }

  console.error(`[Check] Found ${mismatches.length} mismatched contexts.`);
  for (const mismatch of mismatches.slice(0, 20)) {
    console.error(
      `- ${mismatch.title} (${mismatch.id}): all ${mismatch.actualAll}/${mismatch.expectedAll}, published ${mismatch.actualPublished}/${mismatch.expectedPublished}`
    );
  }

  process.exit(1);
}

main().catch((error) => {
  console.error('[Check] Unexpected error:', error);
  process.exit(1);
});

