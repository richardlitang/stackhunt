#!/usr/bin/env npx tsx
/**
 * StackHunt Hunter CLI
 *
 * Command-line interface for the Hunter Agent.
 * Uses the shared Hunter module from src/lib/hunter.ts
 *
 * Usage:
 *   npm run hunt -- --tool="Salesforce"
 *   npm run hunt -- --tool="Slack" --context="Best for Remote Teams"
 *   npm run hunt -- --tool="Notion" --category="productivity" --publish
 *   npm run hunt -- --queue add --tool="HubSpot" --context="Best CRM for Startups"
 *   npm run hunt -- --queue process
 */

import { parseArgs } from 'util';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Dynamic import to handle module resolution
async function main() {
  const { values } = parseArgs({
    options: {
      tool: { type: 'string', short: 't' },
      context: { type: 'string', short: 'c' },
      category: { type: 'string', short: 'g' },
      publish: { type: 'boolean', short: 'p' }, // Skip draft, publish immediately
      queue: { type: 'string', short: 'q' },     // 'add' or 'process'
      priority: { type: 'string' },              // Queue priority (0-100)
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Validate environment
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'SERPER_API_KEY'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Queue operations
  if (values.queue) {
    await handleQueueOperation(values);
    return;
  }

  // Direct hunt
  if (!values.tool) {
    console.error('Error: --tool is required');
    printHelp();
    process.exit(1);
  }

  await runHunt(values);
}

function printHelp() {
  console.log(`
StackHunt Hunter CLI
====================

Usage:
  npm run hunt -- --tool="Tool Name" [options]

Direct Hunt Options:
  -t, --tool      Tool name to research (required)
  -c, --context   Context/audience (e.g., "Best for Small Teams")
  -g, --category  Category slug (e.g., "crm-sales", "productivity")
  -p, --publish   Publish immediately (skip draft review queue)
  -h, --help      Show this help

Queue Operations:
  --queue add     Add tool to content queue for scheduled processing
  --queue process Process next item from queue
  --priority N    Queue priority (0-100, higher = process first)

Examples:
  # Direct hunt (creates draft by default)
  npm run hunt -- --tool="Salesforce"
  npm run hunt -- --tool="Slack" --context="Best for Remote Teams"

  # Publish immediately (skip review queue)
  npm run hunt -- --tool="Notion" --category="productivity" --publish

  # Add to queue for later processing
  npm run hunt -- --queue add --tool="HubSpot" --context="Best CRM" --priority 10

  # Process next queued item
  npm run hunt -- --queue process
`);
}

async function handleQueueOperation(values: Record<string, string | boolean | undefined>) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (values.queue === 'add') {
    if (!values.tool) {
      console.error('Error: --tool is required when adding to queue');
      process.exit(1);
    }

    const { data, error } = await supabase
      .from('content_queue')
      .insert({
        tool_name: values.tool as string,
        context_title: (values.context as string) || null,
        category_slug: (values.category as string) || null,
        priority: parseInt(values.priority as string) || 0,
        source: 'cli',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`Tool "${values.tool}" already in queue`);
      } else {
        console.error('Failed to add to queue:', error.message);
        process.exit(1);
      }
    } else {
      console.log(`Added to queue: ${values.tool}`);
      console.log(`  Context: ${values.context || '(none)'}`);
      console.log(`  Priority: ${data.priority}`);
      console.log(`  Queue ID: ${data.id}`);
    }
    return;
  }

  if (values.queue === 'process') {
    console.log('Processing next item from queue...');
    await runQueueProcess();
    return;
  }

  if (values.queue === 'status') {
    const { data: pending } = await supabase
      .from('content_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(10);

    const { data: drafts } = await supabase
      .from('reviews')
      .select('id, created_at, tool:tools(name), context:contexts(title)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('\n📋 Queue Status\n');

    console.log('Pending in Queue:');
    if (pending?.length) {
      pending.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.tool_name} ${item.context_title ? `(${item.context_title})` : ''} [priority: ${item.priority}]`);
      });
    } else {
      console.log('  (empty)');
    }

    console.log('\nDrafts Awaiting Review:');
    if (drafts?.length) {
      drafts.forEach((item, i) => {
        console.log(`  ${i + 1}. ${(item.tool as { name: string })?.name || 'Unknown'} - ${(item.context as { title: string })?.title || 'No context'}`);
      });
    } else {
      console.log('  (none)');
    }

    return;
  }

  console.error(`Unknown queue operation: ${values.queue}`);
  console.log('Valid operations: add, process, status');
  process.exit(1);
}

async function runHunt(values: Record<string, string | boolean | undefined>) {
  const isDraftMode = !values.publish;

  console.log('═'.repeat(60));
  console.log(`🎯 Starting hunt for: ${values.tool}`);
  if (values.context) console.log(`📋 Context: ${values.context}`);
  if (values.category) console.log(`📁 Category: ${values.category}`);
  console.log(`📝 Mode: ${isDraftMode ? 'DRAFT (requires review)' : 'PUBLISH (live immediately)'}`);
  console.log('═'.repeat(60));

  // Import hunter dynamically (ESM module)
  const { Hunter } = await import('../src/lib/hunter');

  const hunter = new Hunter({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    serperApiKey: process.env.SERPER_API_KEY!,
    isDraftMode,
  });

  const result = await hunter.hunt({
    toolName: values.tool as string,
    contextTitle: values.context as string | undefined,
    categorySlug: values.category as string | undefined,
  });

  console.log('═'.repeat(60));

  if (result.success) {
    console.log(`✅ Hunt complete in ${((result.durationMs || 0) / 1000).toFixed(2)}s`);
    console.log(`   Tool ID: ${result.toolId}`);
    if (result.contextId) console.log(`   Context ID: ${result.contextId}`);
    if (result.reviewId) console.log(`   Review ID: ${result.reviewId}`);
    console.log(`   Tokens used: ${result.tokensUsed}`);

    if (isDraftMode) {
      console.log('\n📝 Review created as DRAFT');
      console.log('   Visit /admin/review to approve and publish');
    } else {
      console.log('\n🚀 Content published immediately');
      console.log(`   View at: /tools/${slugify(values.tool as string)}`);
    }
  } else {
    console.log(`❌ Hunt failed: ${result.error}`);
    process.exit(1);
  }

  console.log('═'.repeat(60));
}

async function runQueueProcess() {
  const { Hunter } = await import('../src/lib/hunter');

  const hunter = new Hunter({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    serperApiKey: process.env.SERPER_API_KEY!,
    isDraftMode: true, // Always draft when processing queue
  });

  const result = await hunter.processNextFromQueue();

  if (result.success) {
    console.log(`✅ Processed queue item`);
    console.log(`   Review ID: ${result.reviewId}`);
  } else if (result.error === 'No items in queue') {
    console.log('📭 Queue is empty');
  } else {
    console.log(`❌ Failed: ${result.error}`);
    process.exit(1);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
