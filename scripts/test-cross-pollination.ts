#!/usr/bin/env npx tsx
/**
 * Test Cross-Pollination
 *
 * Tests the context matcher by:
 * 1. Finding a completed discovery hunt
 * 2. Running cross-pollination analysis
 * 3. Reporting matches
 *
 * Usage:
 *   npx tsx scripts/test-cross-pollination.ts
 *   npx tsx scripts/test-cross-pollination.ts --tool-id=<uuid>
 */

import { createClient } from '@supabase/supabase-js';
import { assignToRelevantContexts } from '../src/lib/hunter/services/context-matcher.js';
import { config } from 'dotenv';
import { parseArgs } from 'util';

config();

const { values } = parseArgs({
  options: {
    'tool-id': { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`
Test Cross-Pollination

Tests context matching for a tool to see which contexts it should appear in.

Usage:
  npx tsx scripts/test-cross-pollination.ts                    # Use first discovery hunt
  npx tsx scripts/test-cross-pollination.ts --tool-id=<uuid>  # Test specific tool

Options:
  --tool-id <uuid>  Tool UUID to test
  -h, --help        Show this help
`);
  process.exit(0);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testCrossPollination() {
  console.log('🧪 Testing Cross-Pollination Logic\n');

  let toolId: string | undefined = values['tool-id'];
  let contextId: string | undefined;

  if (!toolId) {
    // Find a completed discovery hunt
    console.log('Finding a completed discovery hunt...');
    const { data: hunt } = (await supabase
      .from('hunt_queue')
      .select('id, tool_name, context_id, completed_result')
      .eq('status', 'completed')
      .eq('is_discovery_hunt', true)
      .not('completed_result', 'is', null)
      .limit(1)
      .single()) as any;

    if (!hunt) {
      console.log('❌ No completed discovery hunts found');
      console.log(
        '\nRun queue worker first to process discovery hunts:\n  npm run queue:worker -- --once'
      );
      process.exit(1);
    }

    toolId = hunt.completed_result?.toolId;
    contextId = hunt.completed_result?.contextId;

    console.log(`✅ Found hunt: ${hunt.tool_name}`);
    console.log(`   Tool ID: ${toolId}`);
    console.log(`   Origin Context ID: ${contextId}\n`);
  } else {
    // Get context from first review
    console.log(`Using provided tool ID: ${toolId}\n`);
    const { data: review } = (await supabase
      .from('reviews')
      .select('context_id')
      .eq('item_id', toolId)
      .limit(1)
      .single()) as any;

    contextId = review?.context_id;
  }

  if (!toolId || !contextId) {
    console.log('❌ Could not find tool or context ID');
    process.exit(1);
  }

  // Run cross-pollination analysis
  console.log('🎯 Analyzing context relevance...\n');

  const result = await assignToRelevantContexts(toolId, contextId, supabase);

  console.log('\n📊 Results:');
  console.log(`   Origin Context: ${result.origin_context_id}`);
  console.log(`   Matches Found: ${result.matches.length}`);
  console.log(`   Reviews Created: ${result.reviews_created}`);

  if (result.matches.length > 0) {
    console.log('\n✅ Matched Contexts:');
    for (const match of result.matches) {
      console.log(
        `   • ${match.context_title} (${match.relevance_score}% relevance)`
      );
      console.log(`     Reasoning: ${match.reasoning}`);
    }
  } else {
    console.log('\n   No additional contexts matched (threshold: 70%)');
  }

  console.log('\n✅ Test complete');
}

testCrossPollination().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
