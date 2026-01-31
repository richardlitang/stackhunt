#!/usr/bin/env npx tsx
/**
 * Regenerate Embeddings Script
 *
 * Regenerates embeddings for items with NULL embeddings.
 * This is needed after migration 031 which changed embedding dimensions from 1536 to 768.
 *
 * Usage:
 *   npm run regenerate-embeddings                    # Regenerate all NULL embeddings
 *   npm run regenerate-embeddings -- --item-id="uuid" # Regenerate for specific item
 *   npm run regenerate-embeddings -- --dry-run       # Show what would be updated
 *
 * @module scripts/regenerate-embeddings
 */

import { parseArgs } from 'util';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

// Load environment variables
config();

function printHelp(): void {
  console.log(`
StackHunt - Regenerate Embeddings
==================================

Regenerates embeddings for items with NULL embeddings after migration 031.

Usage:
  npm run regenerate-embeddings                    Regenerate all NULL embeddings (items)
  npm run regenerate-embeddings -- [options]       Regenerate with options

Options:
  --table <name>                                   Table to regenerate: items, content_ideas, all
  --item-id <uuid>                                 Regenerate for specific item (items table only)
  --dry-run                                        Show what would be updated
  -h, --help                                       Show this help message

Examples:
  npm run regenerate-embeddings                           # Items table only
  npm run regenerate-embeddings -- --table=content_ideas  # Content ideas only
  npm run regenerate-embeddings -- --table=all            # Both tables
  npm run regenerate-embeddings -- --item-id="dd07ac10-8099-4469-b706-56088fcb3560"
  npm run regenerate-embeddings -- --dry-run
`);
}

interface Args {
  'item-id'?: string;
  'table'?: string;
  'dry-run'?: boolean;
  help?: boolean;
}

async function main(): Promise<void> {
  // Parse arguments
  const { values } = parseArgs({
    options: {
      'item-id': { type: 'string' },
      'table': { type: 'string', default: 'items' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const args = values as Args;

  // Validate table argument
  const validTables = ['items', 'content_ideas', 'all'];
  if (args.table && !validTables.includes(args.table)) {
    console.error(`❌ Error: Invalid table "${args.table}". Must be one of: ${validTables.join(', ')}`);
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!geminiApiKey) {
    console.error('❌ Error: Missing GEMINI_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const tablesToProcess = args.table === 'all' ? ['items', 'content_ideas'] : [args.table!];

  let totalSuccessCount = 0;
  let totalErrorCount = 0;

  for (const tableName of tablesToProcess) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Processing table: ${tableName}`);
    console.log('='.repeat(60) + '\n');

    if (tableName === 'items') {
      await processItemsTable(supabase, model, args, totalSuccessCount, totalErrorCount);
    } else if (tableName === 'content_ideas') {
      await processContentIdeasTable(supabase, model, args, totalSuccessCount, totalErrorCount);
    }
  }
}

async function processItemsTable(
  supabase: any,
  model: any,
  args: Args,
  totalSuccessCount: number,
  totalErrorCount: number
): Promise<void> {
  console.log('🔍 Finding items with NULL embeddings...\n');

  // Query items with NULL embeddings
  let query = supabase
    .from('items')
    .select('id, name, slug, short_description, specs')
    .is('embedding', null);

  if (args['item-id']) {
    query = query.eq('id', args['item-id']);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }

  if (!items || items.length === 0) {
    console.log('✅ No items found with NULL embeddings. All items are up to date!');
    return;
  }

  console.log(`Found ${items.length} item(s) with NULL embeddings:\n`);

  for (const item of items) {
    console.log(`  • ${item.name} (${item.slug})`);
  }

  if (args['dry-run']) {
    console.log('\n🏃 Dry run mode - no changes will be made.');
    return;
  }

  console.log('\n🚀 Starting embedding regeneration...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    try {
      console.log(`⚙️  Processing: ${item.name}`);

      // Build embedding text using the same "Functional Anchor" strategy as analysis.ts
      const specs = item.specs || {};
      const taxonomy = specs.taxonomy || {};
      const features = specs.features || {};
      const competitive = specs.competitive || {};
      const smpPricing = specs.smp_pricing || {};

      const embeddingParts = [
        `Tool: ${item.name}`,
        smpPricing.bundled_in ? `Part of the ${smpPricing.bundled_in} suite` : '',
        taxonomy.primary_function ? `Category: ${taxonomy.primary_function}` : '',
        taxonomy.secondary_functions?.length ? `Also: ${taxonomy.secondary_functions.join(', ')}` : '',
        taxonomy.likely_departments?.length ? `Department: ${taxonomy.likely_departments.join(', ')}` : '',
        features.core?.length ? `Core Features: ${features.core.slice(0, 5).join(', ')}` : '',
        features.unique?.length ? `Unique: ${features.unique.slice(0, 3).join(', ')}` : '',
        competitive.main_alternatives?.length ? `Alternatives: ${competitive.main_alternatives.slice(0, 3).join(', ')}` : '',
        item.short_description ? `Description: ${item.short_description.slice(0, 500)}` : '',
      ].filter(Boolean).join('\n');

      console.log(`   Embedding text: ${embeddingParts.split('\n').slice(0, 3).join(' | ')}...`);

      const result = await model.embedContent(embeddingParts);
      const embedding = result.embedding.values;

      console.log(`   Generated embedding: ${embedding.length} dimensions`);

      const { error: updateError } = await supabase
        .from('items')
        .update({ embedding })
        .eq('id', item.id);

      if (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Updated successfully\n`);
        successCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${item.name}:`, error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Items Table Summary:');
  console.log(`   Total processed: ${items.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(50) + '\n');

  totalSuccessCount += successCount;
  totalErrorCount += errorCount;
}

async function processContentIdeasTable(
  supabase: any,
  model: any,
  args: Args,
  totalSuccessCount: number,
  totalErrorCount: number
): Promise<void> {
  console.log('🔍 Finding content ideas with NULL embeddings...\n');

  const { data: ideas, error } = await supabase
    .from('content_ideas')
    .select('id, keyword, tool_name, keyword_type, context_query')
    .is('embedding', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }

  if (!ideas || ideas.length === 0) {
    console.log('✅ No content ideas found with NULL embeddings. All are up to date!');
    return;
  }

  console.log(`Found ${ideas.length} content idea(s) with NULL embeddings\n`);
  console.log(`Preview (first 10):`);
  for (const idea of ideas.slice(0, 10)) {
    console.log(`  • ${idea.keyword} ${idea.keyword_type ? `[${idea.keyword_type}]` : ''}`);
  }

  if (ideas.length > 10) {
    console.log(`  ... and ${ideas.length - 10} more`);
  }

  if (args['dry-run']) {
    console.log('\n🏃 Dry run mode - no changes will be made.');
    return;
  }

  console.log('\n🚀 Starting embedding regeneration...\n');
  console.log('⚠️  This will make ~229 API calls. Processing in batches with rate limiting...\n');

  let successCount = 0;
  let errorCount = 0;
  const batchSize = 10;

  for (let i = 0; i < ideas.length; i += batchSize) {
    const batch = ideas.slice(i, i + batchSize);
    console.log(`📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ideas.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, ideas.length)})`);

    for (const idea of batch) {
      try {
        // Build embedding text for content ideas (for semantic deduplication)
        const embeddingParts = [
          `Keyword: ${idea.keyword}`,
          idea.keyword_type ? `Type: ${idea.keyword_type}` : '',
          idea.tool_name ? `Tool: ${idea.tool_name}` : '',
          idea.context_query ? `Context: ${idea.context_query}` : '',
        ].filter(Boolean).join('\n');

        const result = await model.embedContent(embeddingParts);
        const embedding = result.embedding.values;

        const { error: updateError } = await supabase
          .from('content_ideas')
          .update({ embedding })
          .eq('id', idea.id);

        if (updateError) {
          console.error(`   ❌ ${idea.keyword}: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ ${idea.keyword}`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ ${idea.keyword}:`, error);
        errorCount++;
      }
    }

    // Rate limiting between batches
    if (i + batchSize < ideas.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Content Ideas Table Summary:');
  console.log(`   Total processed: ${ideas.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(50) + '\n');

  totalSuccessCount += successCount;
  totalErrorCount += errorCount;
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
