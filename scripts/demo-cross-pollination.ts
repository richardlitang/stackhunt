#!/usr/bin/env npx tsx
/**
 * Demo Cross-Pollination
 *
 * Demonstrates context matching by testing on existing tools.
 */

import { createClient } from '@supabase/supabase-js';
import { assignToRelevantContexts } from '../src/lib/hunter/services/context-matcher.js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function demo() {
  console.log('🧪 Demo: Cross-Pollination\n');

  // Get a tool with a context (from a review)
  console.log('Finding a tool with existing context...');
  const { data: review } = (await supabase
    .from('reviews')
    .select('item_id, context_id, contexts(title), items(name)')
    .not('context_id', 'is', null)
    .limit(1)
    .single()) as any;

  if (!review) {
    console.log('❌ No reviews with contexts found');
    process.exit(1);
  }

  const toolName = review.items.name;
  const contextTitle = review.contexts.title;

  console.log(`✅ Found: ${toolName} in context "${contextTitle}"`);
  console.log(`   Tool ID: ${review.item_id}`);
  console.log(`   Context ID: ${review.context_id}\n`);

  // Run cross-pollination
  console.log('🎯 Analyzing which other contexts this tool should appear in...\n');

  const result = await assignToRelevantContexts(
    review.item_id,
    review.context_id,
    supabase
  );

  console.log('📊 Results:');
  console.log(`   Matches Found: ${result.matches.length}`);
  console.log(`   Reviews Created: ${result.reviews_created}\n`);

  if (result.matches.length > 0) {
    console.log('✅ Matched Contexts:\n');
    for (const match of result.matches) {
      console.log(
        `   📌 ${match.context_title} (${match.relevance_score}% relevance)`
      );
      console.log(`      ${match.reasoning}\n`);
    }
  } else {
    console.log('   No additional contexts matched (threshold: 70%)');
    console.log('   This could mean:');
    console.log('   - No other contexts exist yet');
    console.log('   - Existing contexts are not relevant to this tool');
    console.log('   - Tool already has reviews in all relevant contexts');
  }

  console.log('\n✅ Demo complete');
}

demo().catch((error) => {
  console.error('❌ Demo failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
