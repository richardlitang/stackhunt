#!/usr/bin/env npx tsx
/**
 * StackHunt Hunter CLI (v3.0 - Intelligence Engine)
 *
 * Command-line interface for the Hunter Agent + Strategy Gatekeeper.
 * Uses the shared Hunter module from src/lib/hunter.ts
 *
 * Usage:
 *   npm run hunt -- --tool="Salesforce"
 *   npm run hunt -- --tool="Slack" --context="Best for Remote Teams"
 *   npm run hunt -- --queue process
 *   npm run hunt -- --strategy analyze
 *   npm run hunt -- --strategy import --file="keywords.csv"
 */

import { parseArgs } from 'util';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Load environment variables
config();

// Dynamic import to handle module resolution
async function main() {
  const { values } = parseArgs({
    options: {
      tool: { type: 'string', short: 't' },
      context: { type: 'string', short: 'c' },
      category: { type: 'string', short: 'g' },
      publish: { type: 'boolean', short: 'p' },  // Skip draft, publish immediately
      rehunt: { type: 'boolean', short: 'r' },   // Force re-extraction for duplicates
      'research-only': { type: 'boolean' },       // Two-stage: stop after research (for batch synthesis)
      queue: { type: 'string', short: 'q' },      // 'add' | 'process' | 'batch' | 'cleanup' | 'status'
      strategy: { type: 'string', short: 's' },   // 'analyze' | 'import' | 'ahrefs' | 'classify' | 'approve' | 'status' | 'thresholds'
      file: { type: 'string', short: 'f' },       // CSV file for import
      priority: { type: 'string' },               // Queue priority (0-100) or min ROI for approve
      limit: { type: 'string', short: 'l' },      // Limit for batch operations
      'no-filter': { type: 'boolean' },           // Skip filtering for ahrefs import
      'min-volume': { type: 'string' },           // Threshold: min search volume
      'max-difficulty': { type: 'string' },       // Threshold: max keyword difficulty
      'min-cpc': { type: 'string' },              // Threshold: min CPC
      domain: { type: 'string', short: 'd' },     // Competitor domain for import
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Validate environment (only Supabase required for strategy operations)
  const supabaseVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingSupabase = supabaseVars.filter(v => !process.env[v]);
  if (missingSupabase.length > 0) {
    console.error(`Missing required environment variables: ${missingSupabase.join(', ')}`);
    process.exit(1);
  }

  // Strategy operations (The Gatekeeper)
  if (values.strategy) {
    await handleStrategyOperation(values);
    return;
  }

  // Queue operations
  if (values.queue) {
    // Queue processing needs AI keys
    if (values.queue === 'process' || values.queue === 'batch') {
      const aiVars = ['GEMINI_API_KEY', 'SERPER_API_KEY'];
      const missingAi = aiVars.filter(v => !process.env[v]);
      if (missingAi.length > 0) {
        console.error(`Missing AI environment variables for processing: ${missingAi.join(', ')}`);
        process.exit(1);
      }
    }
    await handleQueueOperation(values);
    return;
  }

  // Direct hunt requires AI keys
  const aiVars = ['GEMINI_API_KEY', 'SERPER_API_KEY'];
  const missingAi = aiVars.filter(v => !process.env[v]);
  if (missingAi.length > 0) {
    console.error(`Missing AI environment variables: ${missingAi.join(', ')}`);
    process.exit(1);
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
StackHunt Hunter CLI (v3.0 - Intelligence Engine)
=================================================

The Software Intelligence Engine with Strategy Gatekeeper.
Prevents low-value content and duplicates BEFORE they cost money.

Usage:
  npm run hunt -- --tool="Tool Name" [options]
  npm run hunt -- --strategy <operation> [options]
  npm run hunt -- --queue <operation> [options]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGY GATEKEEPER (CSV Import & ROI Analysis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  --strategy import    Import simple CSV (tool_name, context)
    -f, --file         Path to CSV file (required)

  --strategy ahrefs    Import Ahrefs keyword export (with filtering)
    -f, --file         Path to Ahrefs CSV file (required)
    --no-filter        Skip threshold filtering

  --strategy classify  AI-classify pending keywords (extract tools, detect type)
    -l, --limit        Max items to classify (default: 50)

  --strategy analyze   Analyze pending ideas, check duplicates, calculate ROI
    -l, --limit        Max items to analyze (default: 100)

  --strategy approve   Auto-approve high ROI ideas to hunt queue
    --priority         Min ROI score threshold (default: 5.0)
    -l, --limit        Max items to approve (default: 20)

  --strategy thresholds  View/update import filter thresholds
    --min-volume       Min monthly search volume (default: 50)
    --max-difficulty   Max keyword difficulty (default: 70)
    --min-cpc          Min CPC for commercial intent (default: 0.10)

  --strategy competitors  Import competitor top pages (Ahrefs/SEMrush)
    -f, --file         Path to competitor pages CSV
    -d, --domain       Competitor domain (required)

  --strategy gaps      Show keyword gap analysis vs competitors
    -l, --limit        Max gaps to show (default: 20)

  --strategy status    Show Strategy War Room dashboard

Ahrefs CSV Format (columns):
  Keyword, Difficulty, Volume, CPC, Clicks, CPS, Return Rate, Parent Keyword

Simple CSV Format (columns):
  keyword, tool_name, context_query, search_volume, keyword_difficulty, cpc

Competitor CSV Format (Ahrefs Top Pages):
  #, Traffic, %, Value, Keywords, RD, Page URL, Top keyword, Its volume, Pos.

Examples:
  npm run hunt -- --strategy ahrefs --file="ahrefs-export.csv"
  npm run hunt -- --strategy classify --limit 20
  npm run hunt -- --strategy thresholds --min-volume 100 --max-difficulty 50
  npm run hunt -- --strategy competitors --file="competitor-pages.csv" --domain="competitor.com"
  npm run hunt -- --strategy gaps --limit 20
  npm run hunt -- --strategy analyze
  npm run hunt -- --strategy approve --priority 10 --limit 10
  npm run hunt -- --strategy status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HUNT QUEUE (Worker Operations)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  --queue add          Add tool to hunt queue
    -t, --tool         Tool name (required)
    -c, --context      Context/audience
    --priority         Priority 0-100 (default: 50)

  --queue process      Process next item from queue
  --queue batch        Process multiple items
    --priority         Max items to process (default: 5)

  --queue cleanup      Release stale claims from dead workers
  --queue status       Show queue status dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIRECT HUNT (Bypass Queue)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  -t, --tool           Tool name to research (required)
  -c, --context        Context/audience
  -g, --category       Category slug
  -p, --publish        Publish immediately (skip draft review)
  --research-only      Two-stage: stop after research phase (for batch synthesis)

Examples:
  npm run hunt -- --tool="Salesforce"
  npm run hunt -- --tool="Slack" --context="Best for Remote Teams"
  npm run hunt -- --tool="Notion" --publish
  npm run hunt -- --tool="Cursor" --context="Best AI Code Editor" --research-only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW: CSV → Strategy Gatekeeper → Hunt Queue → CLI Worker
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Import CSV:     npm run hunt -- --strategy import --file="keywords.csv"
2. Analyze ROI:    npm run hunt -- --strategy analyze
3. Auto-Approve:   npm run hunt -- --strategy approve --priority 5
4. Process Queue:  npm run hunt -- --queue process

VPS Cron Jobs:
  */5 * * * *  npm run hunt -- --queue process
  0 * * * *    npm run hunt -- --queue cleanup
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
      .from('hunt_queue')
      .insert({
        tool_name: values.tool as string,
        context_title: (values.context as string) || null,
        category_slug: (values.category as string) || null,
        priority: parseInt(values.priority as string) || 50,
        source: 'admin',
        hunt_type: 'full',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`Tool "${values.tool}" already in queue (pending/processing)`);
      } else {
        console.error('Failed to add to queue:', error.message);
        process.exit(1);
      }
    } else {
      console.log(`Added to hunt queue: ${values.tool}`);
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

  if (values.queue === 'batch') {
    const batchSize = parseInt(values.priority as string) || 5;
    console.log(`Processing up to ${batchSize} items from queue...`);
    await runBatchProcess(batchSize);
    return;
  }

  if (values.queue === 'cleanup') {
    console.log('Releasing stale queue claims...');
    await runCleanup();
    return;
  }

  if (values.queue === 'status') {
    // Pending items
    const { data: pending } = await supabase
      .from('hunt_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(10);

    // Processing items
    const { data: processing } = await supabase
      .from('hunt_queue')
      .select('*')
      .in('status', ['claimed', 'processing'])
      .order('claimed_at', { ascending: false })
      .limit(5);

    // Recent failures
    const { data: failed } = await supabase
      .from('hunt_queue')
      .select('*')
      .eq('status', 'failed')
      .order('completed_at', { ascending: false })
      .limit(5);

    // Drafts awaiting review
    const { data: drafts } = await supabase
      .from('reviews')
      .select('id, created_at, tool:tools(name), context:contexts(title)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('\n📋 Hunt Queue Status\n');
    console.log('═'.repeat(50));

    console.log('\n⏳ Pending:');
    if (pending?.length) {
      pending.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.tool_name} ${item.context_title ? `(${item.context_title})` : ''}`);
        console.log(`     Priority: ${item.priority} | Source: ${item.source}`);
      });
    } else {
      console.log('  (empty)');
    }

    console.log('\n🔄 Processing:');
    if (processing?.length) {
      processing.forEach((item, i) => {
        const stale = item.heartbeat_at && new Date(item.heartbeat_at) < new Date(Date.now() - 5 * 60 * 1000);
        console.log(`  ${i + 1}. ${item.tool_name} [${item.status}]${stale ? ' ⚠️ STALE' : ''}`);
        console.log(`     Worker: ${item.claimed_by || 'unknown'}`);
      });
    } else {
      console.log('  (none)');
    }

    console.log('\n❌ Recent Failures:');
    if (failed?.length) {
      failed.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.tool_name}`);
        console.log(`     Error: ${item.error_message?.slice(0, 60)}...`);
      });
    } else {
      console.log('  (none)');
    }

    console.log('\n📝 Drafts Awaiting Review:');
    if (drafts?.length) {
      drafts.forEach((item, i) => {
        console.log(`  ${i + 1}. ${(item.tool as { name: string })?.name || 'Unknown'} - ${(item.context as { title: string })?.title || 'No context'}`);
      });
    } else {
      console.log('  (none)');
    }

    console.log('\n' + '═'.repeat(50));
    return;
  }

  console.error(`Unknown queue operation: ${values.queue}`);
  console.log('Valid operations: add, process, batch, cleanup, status');
  process.exit(1);
}

async function runHunt(values: Record<string, string | boolean | undefined>) {
  const isDraftMode = !values.publish;
  const forceUpdate = !!values.rehunt;
  const researchOnly = !!values['research-only'];

  console.log('═'.repeat(60));
  console.log(`🎯 Starting hunt for: ${values.tool}`);
  if (values.context) console.log(`📋 Context: ${values.context}`);
  if (values.category) console.log(`📁 Category: ${values.category}`);
  if (researchOnly) {
    console.log(`🔬 Mode: RESEARCH ONLY (will await batch synthesis)`);
  } else {
    console.log(`📝 Mode: ${isDraftMode ? 'DRAFT (requires review)' : 'PUBLISH (live immediately)'}`);
  }
  if (forceUpdate) console.log(`🔄 Force update: Re-extracting data for existing tool`);
  console.log('═'.repeat(60));

  // Import hunter dynamically (ESM module)
  const { Hunter } = await import('../src/lib/hunter');
  const { createClient } = await import('@supabase/supabase-js');
  const { ensureClassification } = await import('../src/lib/hunter/services/keyword-classifier.js');

  // V5: Ensure tool is classified before hunting (so Hunter gets Research Dossier)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`\n🤖 Checking classification for "${values.tool}"...`);
  const classificationResult = await ensureClassification(values.tool as string, supabase, {
    onLog: console.log,
    contextTitle: values.context as string | undefined,
  });

  let researchDossier = undefined;
  if (classificationResult.success && classificationResult.research_dossier) {
    console.log(`✓ Classification ready: ${classificationResult.research_dossier.primary_category}`);
    researchDossier = classificationResult.research_dossier;
  } else {
    console.log(`⚠️  Classification failed or N/A, using fallback queries`);
  }
  console.log('');

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
    forceUpdate,
    researchDossier, // V5: Pass dossier to Hunter
    skipSynthesis: researchOnly, // Two-stage: stop after research for batch synthesis
  });

  console.log('═'.repeat(60));

  if (result.success) {
    console.log(`✅ Hunt complete in ${((result.durationMs || 0) / 1000).toFixed(2)}s`);
    console.log(`   Tool ID: ${result.toolId}`);
    if (result.contextId) console.log(`   Context ID: ${result.contextId}`);
    if (result.reviewId) console.log(`   Review ID: ${result.reviewId}`);
    console.log(`   Tokens used: ${result.tokensUsed}`);

    if (researchOnly) {
      console.log('\n🔬 Research phase complete');
      console.log('   Status: research_complete (awaiting batch synthesis)');
      console.log('   Run batch synthesis: npm run queue:worker');
    } else if (isDraftMode) {
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

async function runBatchProcess(maxItems: number) {
  const { Hunter } = await import('../src/lib/hunter');
  const { ApiError } = await import('../src/lib/hunter/errors');
  const { alertCritical, alertQueueSummary } = await import('../src/lib/notifications/discord');

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

  const hunter = new Hunter({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    serperApiKey: process.env.SERPER_API_KEY!,
    isDraftMode: true,
  });

  console.log('═'.repeat(60));
  console.log(`🔄 Starting batch processing (max ${maxItems} items)`);
  console.log('═'.repeat(60));

  let result: { processed: number; succeeded: number; failed: number; results: Array<{ success: boolean; error?: string; toolName?: string }> };
  const errors: Array<{ tool: string; error: string }> = [];

  try {
    result = await hunter.processQueueBatch(maxItems);

    // Collect errors from failed results
    for (const r of result.results) {
      if (!r.success && r.error) {
        errors.push({ tool: r.toolName || 'Unknown', error: r.error });
      }
    }
  } catch (error) {
    // Check if this is a critical API error
    if (error instanceof ApiError && error.isCritical) {
      console.error(`❌ CRITICAL API ERROR: ${error.message}`);

      // Send immediate Discord alert for critical errors
      if (discordWebhookUrl) {
        await alertCritical(discordWebhookUrl, {
          title: `${error.service.toUpperCase()} API Failure`,
          message: error.message,
          service: error.service,
          action: error.type === 'auth_error'
            ? 'Check and update API key in GitHub Secrets'
            : error.type === 'quota_exceeded'
            ? 'Check billing and quota limits'
            : 'Review error logs and contact support',
        });
      }

      // Re-throw to fail the job
      throw error;
    }

    // Non-critical errors
    throw error;
  }

  console.log('═'.repeat(60));
  console.log('📊 Batch Processing Complete');
  console.log(`   Processed: ${result.processed}`);
  console.log(`   Succeeded: ${result.succeeded}`);
  console.log(`   Failed: ${result.failed}`);
  console.log('═'.repeat(60));

  // Send summary to Discord if there were failures or if we processed items
  if (discordWebhookUrl && result.processed > 0) {
    await alertQueueSummary(discordWebhookUrl, {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors,
    });
  }

  if (result.failed > 0) {
    process.exit(1);
  }
}

async function runCleanup() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Call the database function to release stale claims
  const { data, error } = await supabase.rpc('release_stale_hunt_claims', {
    p_stale_minutes: 10,
  });

  if (error) {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
  }

  const released = data as number;
  if (released > 0) {
    console.log(`🧹 Released ${released} stale queue claims`);
  } else {
    console.log('✅ No stale claims to release');
  }
}

// =============================================================================
// STRATEGY GATEKEEPER OPERATIONS
// =============================================================================

async function handleStrategyOperation(values: Record<string, string | boolean | undefined>) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const operation = values.strategy as string;

  switch (operation) {
    case 'import':
      await handleStrategyImport(supabase, values);
      break;
    case 'ahrefs':
      await handleAhrefsImport(supabase, values);
      break;
    case 'classify':
      await handleKeywordClassify(supabase, values);
      break;
    case 'analyze':
      await handleStrategyAnalyze(supabase, values);
      break;
    case 'approve':
      await handleStrategyApprove(supabase, values);
      break;
    case 'status':
      await handleStrategyStatus(supabase);
      break;
    case 'thresholds':
      await handleThresholds(supabase, values);
      break;
    case 'competitors':
      await handleCompetitorImport(supabase, values);
      break;
    case 'gaps':
      await handleGapAnalysis(supabase, values);
      break;
    default:
      console.error(`Unknown strategy operation: ${operation}`);
      console.log('Valid operations: import, ahrefs, classify, analyze, approve, status, thresholds, competitors, gaps');
      process.exit(1);
  }
}

/**
 * Import keywords from CSV file into content_ideas staging table
 */
async function handleStrategyImport(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const filePath = values.file as string;

  if (!filePath) {
    console.error('Error: --file is required for import');
    console.log('Usage: npm run hunt -- --strategy import --file="keywords.csv"');
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('📥 Strategy Gatekeeper: CSV Import');
  console.log('═'.repeat(60));

  // Read and parse CSV
  const csvContent = readFileSync(filePath, 'utf-8');
  let records: Array<Record<string, string>>;

  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    console.error('Failed to parse CSV:', (err as Error).message);
    process.exit(1);
  }

  console.log(`Found ${records.length} rows in CSV`);

  // Create import batch
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({
      filename: filePath.split('/').pop() || filePath,
      total_rows: records.length,
      status: 'processing',
    })
    .select()
    .single();

  if (batchError) {
    console.error('Failed to create import batch:', batchError.message);
    process.exit(1);
  }

  console.log(`Created import batch: ${batch.id}`);

  // Process each row
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of records) {
    // Map CSV columns (flexible column names)
    const keyword = row.keyword || row.Keyword || row.term || row.Term;
    const toolName = row.tool_name || row.tool || row.Tool || row['Tool Name'];
    const contextQuery = row.context_query || row.context || row.Context || row.audience;
    const searchVolume = parseInt(row.search_volume || row.volume || row.Volume || '0', 10);
    const keywordDifficulty = parseInt(row.keyword_difficulty || row.difficulty || row.KD || row.kd || '0', 10);
    const cpc = parseFloat(row.cpc || row.CPC || '0');

    // New fields for LLM brainstorm format
    const pillar = row.pillar || row.Pillar || null;
    const targetAudience = row.target_audience || row.audience || row.Audience || null;
    const contentType = row.content_type || row.type || row.Type || null;
    const notes = row.notes || row.Notes || row.editorial_notes || null;

    // Priority: accept number (0-100) or text (high/medium/low)
    const rawPriority = row.priority || row.Priority || '50';
    let priority = 50;
    if (/^\d+$/.test(rawPriority)) {
      priority = Math.min(Math.max(parseInt(rawPriority, 10), 0), 100);
    } else {
      // Convert text to number (higher = more important)
      const priorityMap: Record<string, number> = {
        critical: 95, urgent: 90, high: 80, medium: 50, low: 30, backlog: 10,
      };
      priority = priorityMap[rawPriority.toLowerCase()] || 50;
    }

    // Validate pillar
    const validPillars = ['builder', 'creative', 'growth', 'operations'];
    const normalizedPillar = pillar && validPillars.includes(pillar.toLowerCase())
      ? pillar.toLowerCase()
      : null;

    // Validate target audience
    const validAudiences = [
      'freelancers', 'solopreneurs', 'small-teams', 'agencies',
      'startups', 'enterprise', 'developers', 'designers',
      'marketers', 'content-creators', 'consultants', 'coaches',
      'remote-teams', 'sales-teams', 'finance-teams', 'students',
      'non-profits', 'virtual-assistants', 'creatives', 'founders',
    ];
    const normalizedAudience = targetAudience && validAudiences.includes(targetAudience.toLowerCase())
      ? targetAudience.toLowerCase()
      : null;

    // Validate content type
    const validContentTypes = ['listicle', 'comparison', 'alternatives', 'single_tool', 'roundup'];
    const normalizedContentType = contentType && validContentTypes.includes(contentType.toLowerCase())
      ? contentType.toLowerCase()
      : null;

    if (!keyword && !toolName) {
      skipped++;
      continue;
    }

    // Determine source format
    const hasLlmFields = pillar || targetAudience || contentType || notes || (rawPriority && !/^\d+$/.test(rawPriority));
    const sourceFormat = hasLlmFields ? 'llm_brainstorm' : 'simple';

    // Insert into content_ideas
    const { error: insertError } = await supabase
      .from('content_ideas')
      .insert({
        keyword: keyword || toolName,
        tool_name: toolName || keyword,
        context_query: contextQuery || null,
        search_volume: searchVolume || null,
        keyword_difficulty: keywordDifficulty || null,
        cpc: cpc || null,
        pillar: normalizedPillar,
        target_audience: normalizedAudience,
        content_type: normalizedContentType,
        priority: priority,
        notes: notes,
        source: 'csv_import',
        source_format: sourceFormat,
        import_batch_id: batch.id,
        status: 'pending',
      });

    if (insertError) {
      if (insertError.code === '23505') {
        // Duplicate - already exists
        skipped++;
      } else {
        console.error(`  Error inserting "${keyword || toolName}": ${insertError.message}`);
        errors++;
      }
    } else {
      imported++;
    }
  }

  // Update batch status
  await supabase
    .from('import_batches')
    .update({
      imported_rows: imported,
      duplicate_rows: skipped,
      error_rows: errors,
      status: errors > 0 ? 'completed_with_errors' : 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', batch.id);

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 Import Summary');
  console.log('═'.repeat(60));
  console.log(`  Total rows:    ${records.length}`);
  console.log(`  Imported:      ${imported}`);
  console.log(`  Skipped:       ${skipped} (duplicates or empty)`);
  console.log(`  Errors:        ${errors}`);
  console.log('');
  console.log('Next step: npm run hunt -- --strategy analyze');
  console.log('═'.repeat(60));
}

/**
 * Analyze pending ideas: calculate ROI, check duplicates
 */
async function handleStrategyAnalyze(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const limit = parseInt(values.limit as string) || 100;

  console.log('═'.repeat(60));
  console.log('🔬 Strategy Gatekeeper: ROI Analysis');
  console.log('═'.repeat(60));

  // The analyze_content_ideas function returns a TABLE of analyzed ideas
  // It analyzes pending ideas and returns recommendations
  const { data: analyzed, error } = await supabase.rpc('analyze_content_ideas', {
    p_limit: limit,
  });

  if (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }

  const ideas = analyzed as Array<{
    id: string;
    keyword: string;
    tool_name: string | null;
    roi_score: number | null;
    is_duplicate: boolean;
    duplicate_reason: string | null;
    recommendation: string;
  }>;

  // Calculate stats from returned rows
  const totalAnalyzed = ideas.length;
  const duplicatesFound = ideas.filter(i => i.is_duplicate).length;
  const rejected = ideas.filter(i => i.recommendation?.startsWith('REJECT')).length;
  const highRoi = ideas.filter(i => i.recommendation?.includes('High ROI')).length;

  console.log(`  Analyzed:        ${totalAnalyzed} ideas`);
  console.log(`  Duplicates:      ${duplicatesFound} found`);
  console.log(`  Rejected:        ${rejected} (low ROI or duplicates)`);
  console.log(`  High ROI:        ${highRoi} opportunities`);

  // Show top candidates (non-duplicates with highest ROI)
  const topIdeas = ideas
    .filter(i => !i.is_duplicate && i.roi_score !== null)
    .sort((a, b) => (b.roi_score || 0) - (a.roi_score || 0))
    .slice(0, 10);

  if (topIdeas.length) {
    console.log('');
    console.log('🏆 Top ROI Candidates:');
    console.log('─'.repeat(60));
    topIdeas.forEach((idea, i) => {
      const roi = idea.roi_score?.toFixed(2) || '0.00';
      const rec = idea.recommendation || 'REVIEW';
      console.log(`  ${i + 1}. ${idea.tool_name || idea.keyword}`);
      console.log(`     ROI: ${roi} | ${rec}`);
    });
  } else {
    console.log('');
    console.log('No high-ROI candidates found. Import more keywords or lower the threshold.');
  }

  console.log('');
  console.log('Next step: npm run hunt -- --strategy approve --priority 5');
  console.log('═'.repeat(60));
}

/**
 * Auto-approve high ROI ideas to hunt queue
 */
async function handleStrategyApprove(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const minRoi = parseFloat(values.priority as string) || 5.0;
  const limit = parseInt(values.limit as string) || 20;

  console.log('═'.repeat(60));
  console.log('✅ Strategy Gatekeeper: Auto-Approve to Queue');
  console.log('═'.repeat(60));
  console.log(`  Min ROI threshold: ${minRoi}`);
  console.log(`  Max items: ${limit}`);
  console.log('');

  // Call bulk approve function
  // Returns TABLE(approved_count INT, queue_ids UUID[])
  const { data, error } = await supabase.rpc('bulk_approve_ideas', {
    p_min_roi: minRoi,
    p_max_count: limit,
    p_approved_by: 'cli',
  });

  if (error) {
    console.error('Approval failed:', error.message);
    process.exit(1);
  }

  // Result is an array with one row containing approved_count and queue_ids
  const result = (data as Array<{ approved_count: number; queue_ids: string[] }>)?.[0];
  const approvedCount = result?.approved_count || 0;
  const queueIds = result?.queue_ids || [];

  console.log(`  Approved:  ${approvedCount} ideas`);
  console.log(`  Queued:    ${queueIds.length} items added to hunt queue`);

  if (queueIds.length > 0) {
    console.log('');
    console.log('Queue IDs:');
    queueIds.slice(0, 5).forEach((id, i) => {
      console.log(`  ${i + 1}. ${id}`);
    });
    if (queueIds.length > 5) {
      console.log(`  ... and ${queueIds.length - 5} more`);
    }
  }

  console.log('');
  console.log('Next step: npm run hunt -- --queue process');
  console.log('═'.repeat(60));
}

/**
 * Show Strategy War Room dashboard
 */
async function handleStrategyStatus(supabase: ReturnType<typeof createClient>) {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🎯 STRATEGY WAR ROOM');
  console.log('═'.repeat(60));

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from('content_ideas')
    .select('status')
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach(row => {
        counts[row.status] = (counts[row.status] || 0) + 1;
      });
      return { data: counts };
    });

  const pending = statusCounts?.pending || 0;
  const analyzed = statusCounts?.analyzed || 0;
  const approved = statusCounts?.approved || 0;
  const rejected = statusCounts?.rejected || 0;

  console.log('');
  console.log('📊 Content Ideas Pipeline:');
  console.log('─'.repeat(40));
  console.log(`  ⏳ Pending analysis:  ${pending}`);
  console.log(`  🔬 Analyzed:          ${analyzed}`);
  console.log(`  ✅ Approved:          ${approved}`);
  console.log(`  ❌ Rejected:          ${rejected}`);

  // Duplicate stats
  const { count: duplicateCount } = await supabase
    .from('content_ideas')
    .select('*', { count: 'exact', head: true })
    .eq('is_duplicate', true);

  console.log(`  🔄 Duplicates found:  ${duplicateCount || 0}`);

  // Recent imports
  const { data: recentBatches } = await supabase
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentBatches?.length) {
    console.log('');
    console.log('📥 Recent Imports:');
    console.log('─'.repeat(40));
    recentBatches.forEach((batch) => {
      const date = new Date(batch.created_at).toLocaleDateString();
      console.log(`  ${batch.filename} (${date})`);
      console.log(`    ${batch.imported_rows}/${batch.total_rows} imported | Status: ${batch.status}`);
    });
  }

  // Queue status
  const { count: queuePending } = await supabase
    .from('hunt_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: queueProcessing } = await supabase
    .from('hunt_queue')
    .select('*', { count: 'exact', head: true })
    .in('status', ['claimed', 'processing']);

  console.log('');
  console.log('🎯 Hunt Queue:');
  console.log('─'.repeat(40));
  console.log(`  ⏳ Pending:     ${queuePending || 0}`);
  console.log(`  🔄 Processing:  ${queueProcessing || 0}`);

  // Top pending ideas by ROI
  const { data: topPending } = await supabase
    .from('content_ideas')
    .select('keyword, tool_name, roi_score')
    .eq('status', 'analyzed')
    .eq('is_duplicate', false)
    .order('roi_score', { ascending: false })
    .limit(5);

  if (topPending?.length) {
    console.log('');
    console.log('🏆 Top Pending (Ready to Approve):');
    console.log('─'.repeat(40));
    topPending.forEach((idea, i) => {
      const name = idea.tool_name || idea.keyword;
      const roi = idea.roi_score?.toFixed(2) || '0.00';
      console.log(`  ${i + 1}. ${name} (ROI: ${roi})`);
    });
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('Commands:');
  console.log('  npm run hunt -- --strategy import --file="keywords.csv"');
  console.log('  npm run hunt -- --strategy analyze');
  console.log('  npm run hunt -- --strategy approve --priority 5');
  console.log('  npm run hunt -- --queue process');
  console.log('═'.repeat(60));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// =============================================================================
// AHREFS IMPORT & KEYWORD CLASSIFICATION
// =============================================================================

/**
 * Import keywords from Ahrefs CSV export with filtering
 */
async function handleAhrefsImport(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const filePath = values.file as string;
  const applyFilters = !values['no-filter'];

  if (!filePath) {
    console.error('Error: --file is required for ahrefs import');
    console.log('Usage: npm run hunt -- --strategy ahrefs --file="ahrefs-export.csv"');
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('📥 Strategy Gatekeeper: Ahrefs Import');
  console.log('═'.repeat(60));

  // Get current thresholds
  if (applyFilters) {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'keyword_import_thresholds')
      .single();

    const thresholds = settings?.value as Record<string, number> | undefined;
    console.log('');
    console.log('📏 Filter Thresholds:');
    console.log(`  Min Volume:     ${thresholds?.min_volume || 50}`);
    console.log(`  Max Difficulty: ${thresholds?.max_difficulty || 70}`);
    console.log(`  Min CPC:        $${thresholds?.min_cpc || 0.10}`);
    console.log('');
  } else {
    console.log('');
    console.log('⚠️  Filters DISABLED - importing all keywords');
    console.log('');
  }

  // Read and parse CSV
  const csvContent = readFileSync(filePath, 'utf-8');
  let records: Array<Record<string, string>>;

  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (err) {
    console.error('Failed to parse CSV:', (err as Error).message);
    process.exit(1);
  }

  console.log(`Found ${records.length} rows in CSV`);

  // Create import batch
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({
      filename: filePath.split('/').pop() || filePath,
      total_rows: records.length,
      status: 'processing',
      notes: `Ahrefs import, filters: ${applyFilters ? 'enabled' : 'disabled'}`,
    })
    .select()
    .single();

  if (batchError) {
    console.error('Failed to create import batch:', batchError.message);
    process.exit(1);
  }

  console.log(`Created import batch: ${batch.id}`);

  // Transform Ahrefs format to our format
  // Ahrefs columns: #, Keyword, Difficulty, Volume, CPC, Clicks, CPS, Return Rate, Parent Keyword
  const keywords = records.map(row => ({
    keyword: row.Keyword || row.keyword || '',
    difficulty: parseInt(row.Difficulty || row.difficulty || '0', 10),
    volume: parseInt(row.Volume || row.volume || '0', 10),
    cpc: parseFloat(row.CPC || row.cpc || '0'),
    clicks: row.Clicks ? parseInt(row.Clicks, 10) : null,
    cps: row.CPS ? parseFloat(row.CPS) : null,
    return_rate: row['Return Rate'] ? parseFloat(row['Return Rate']) : null,
    parent_keyword: row['Parent Keyword'] || row.parent_keyword || null,
  })).filter(k => k.keyword);  // Remove empty keywords

  console.log(`Parsed ${keywords.length} valid keywords`);

  // Call bulk import RPC
  const { data: result, error: importError } = await supabase.rpc('import_ahrefs_keywords', {
    p_keywords: keywords,
    p_batch_id: batch.id,
    p_apply_filters: applyFilters,
  });

  if (importError) {
    console.error('Import failed:', importError.message);
    // Update batch as failed
    await supabase
      .from('import_batches')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', batch.id);
    process.exit(1);
  }

  const importResult = result as { imported: number; filtered: number; duplicates: number };

  // Update batch status
  await supabase
    .from('import_batches')
    .update({
      imported_rows: importResult.imported,
      duplicate_rows: importResult.duplicates,
      error_rows: importResult.filtered,  // Using error_rows for filtered count
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', batch.id);

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 Import Summary');
  console.log('═'.repeat(60));
  console.log(`  Total keywords: ${keywords.length}`);
  console.log(`  Imported:       ${importResult.imported} ✅`);
  console.log(`  Filtered:       ${importResult.filtered} (below thresholds)`);
  console.log(`  Duplicates:     ${importResult.duplicates}`);
  console.log('');

  if (importResult.imported > 0) {
    console.log('Next step: npm run hunt -- --strategy classify');
  } else {
    console.log('No keywords imported. Try adjusting thresholds:');
    console.log('  npm run hunt -- --strategy thresholds --min-volume 20');
  }
  console.log('═'.repeat(60));
}

/**
 * AI-classify pending keywords to determine type and extract tools
 */
async function handleKeywordClassify(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const limit = parseInt(values.limit as string) || 50;

  // Check for Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY required for classification');
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('🤖 Strategy Gatekeeper: AI Keyword Classification');
  console.log('═'.repeat(60));

  // Get unclassified keywords
  const { data: keywords, error } = await supabase
    .from('content_ideas')
    .select('id, keyword, parent_keyword')
    .is('keyword_type', null)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch keywords:', error.message);
    process.exit(1);
  }

  if (!keywords?.length) {
    console.log('No unclassified keywords found.');
    console.log('Import keywords first: npm run hunt -- --strategy ahrefs --file="export.csv"');
    return;
  }

  console.log(`Found ${keywords.length} keywords to classify`);
  console.log('');

  // Import Gemini service
  const { GoogleGenAI, ThinkingLevel } = await import('@google/genai');
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  let classified = 0;
  let failed = 0;

  // Process in batches of 10 for efficiency
  const batchSize = 10;
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const keywordList = batch.map(k => k.keyword).join('\n');

    const prompt = `You are a Search Strategist and Research Planner for a SaaS comparison website.

Your job: Take raw keywords and create PRECISE "Research Dossiers" that tell our scraper exactly what to search for.

CRITICAL: DISAMBIGUATE tool names. Examples:
- "claude" → "Anthropic Claude" (AI model, NOT Claude Monet)
- "flash" → "Adobe Flash Player" (legacy, NOT camera flash)
- "box" → "Box.com" (cloud storage, NOT shipping boxes)
- "notion" → "Notion" (already clear)

For each keyword, determine:

1. type: One of: best_list, comparison, alternatives, single_tool, informational, skip
   - best_list: "best X software", "top X tools" → user wants a list
   - comparison: "X vs Y" → comparing 2+ specific tools
   - alternatives: "X alternatives" → similar tools to X
   - single_tool: "X pricing", "X review" → deep dive on one tool
   - informational: How-to guides, no commercial intent → SKIP
   - skip: Spam, nonsense, irrelevant

2. extracted_tools: Array of DISAMBIGUATED tool names

3. suggested_context: Context page title (null if not best_list)

4. research_dossier: ONLY for single_tool and comparison types:
   - normalized_tool_name: Fully qualified name (e.g., "Anthropic Claude")
   - primary_category: One of: ai_model, api_platform, saas_collaboration, saas_productivity, crm_sales, marketing_email, database_storage, devtools, legacy_defunct, consumer_media, infrastructure, design_creative, video_conferencing, generic_saas
   - scout_queries: 3-5 TARGETED queries based on category:
     * ai_model → token pricing, context limits, benchmarks
     * api_platform → per-request pricing, rate limits, overage charges
     * saas_collaboration → seat limits, storage quotas, SSO costs
     * legacy_defunct → shutdown date, alternatives, migration guides
   - forensic_targets: 1-3 specific constraints to hunt (choose from: record_count, storage_gb, api_requests_per_month, api_rate_limit_per_sec, seat_count, project_count, active_contacts, message_credits, concurrent_users, bandwidth_gb, build_minutes, shutdown_status)
   - confidence: high/medium/low (based on how confident you are in classification)
   - red_flags: Array of warning signals (e.g., ["No pricing page found", "Mentions 'discontinued'"])

EXAMPLES:

INPUT: "claude pricing"
OUTPUT:
{
  "keyword": "claude pricing",
  "type": "single_tool",
  "extracted_tools": ["Anthropic Claude"],
  "suggested_context": null,
  "research_dossier": {
    "normalized_tool_name": "Anthropic Claude",
    "primary_category": "ai_model",
    "scout_queries": [
      "Anthropic Claude pricing tokens vs subscription",
      "Claude 3.5 Sonnet context window limit",
      "Claude API rate limits documentation",
      "Claude vs GPT-4 cost comparison",
      "Claude enterprise pricing hidden costs"
    ],
    "forensic_targets": ["api_requests_per_month", "api_rate_limit_per_sec"],
    "confidence": "high",
    "red_flags": []
  }
}

INPUT: "adobe flash alternatives"
OUTPUT:
{
  "keyword": "adobe flash alternatives",
  "type": "alternatives",
  "extracted_tools": ["Adobe Flash Player"],
  "suggested_context": "Best Adobe Flash Player Alternatives",
  "research_dossier": {
    "normalized_tool_name": "Adobe Flash Player",
    "primary_category": "legacy_defunct",
    "scout_queries": [
      "Adobe Flash Player shutdown date 2020",
      "Adobe Flash alternatives 2026",
      "Ruffle emulator Flash replacement",
      "HTML5 canvas Flash migration",
      "Flash end of life announcement"
    ],
    "forensic_targets": ["shutdown_status"],
    "confidence": "high",
    "red_flags": ["Adobe discontinued 2020", "End of life"]
  }
}

INPUT: "best project management software"
OUTPUT:
{
  "keyword": "best project management software",
  "type": "best_list",
  "extracted_tools": [],
  "suggested_context": "Best Project Management Software",
  "research_dossier": null
}

KEYWORDS:
${keywordList}

Respond in JSON format:
{
  "classifications": [
    { ... }
  ]
}`;

    try {
      const result = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW, // Fast strategist
          },
        },
      });
      const text = result.text;

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`  Batch ${i / batchSize + 1}: Failed to parse response`);
        failed += batch.length;
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        classifications: Array<{
          keyword: string;
          type: string;
          extracted_tools: string[];
          suggested_context: string | null;
          research_dossier?: {
            normalized_tool_name: string;
            primary_category: string;
            scout_queries: string[];
            forensic_targets: string[];
            confidence: 'high' | 'medium' | 'low';
            red_flags?: string[];
          };
        }>;
      };

      // Update each keyword
      for (const classification of parsed.classifications) {
        const idea = batch.find(k => k.keyword === classification.keyword);
        if (!idea) continue;

        // Use normalized name from dossier if available
        const toolName = classification.research_dossier?.normalized_tool_name
          || classification.extracted_tools?.[0]
          || null;

        const { error: updateError } = await supabase.rpc('update_keyword_classification', {
          p_idea_id: idea.id,
          p_keyword_type: classification.type,
          p_extracted_tools: classification.extracted_tools || [],
          p_tool_name: toolName,
          p_context_query: classification.suggested_context,
          p_ai_response: classification,
        });

        if (updateError) {
          console.error(`  Failed to update "${classification.keyword}": ${updateError.message}`);
          failed++;
        } else {
          classified++;
          const tools = classification.extracted_tools?.length
            ? `[${classification.extracted_tools.join(', ')}]`
            : '(none)';
          console.log(`  ✓ ${classification.keyword}`);
          console.log(`    Type: ${classification.type} | Tools: ${tools}`);

          // Show dossier info if present
          if (classification.research_dossier) {
            const dossier = classification.research_dossier;
            console.log(`    Category: ${dossier.primary_category} | Confidence: ${dossier.confidence}`);
            console.log(`    Queries: ${dossier.scout_queries.length} | Targets: ${dossier.forensic_targets.join(', ')}`);
            if (dossier.red_flags?.length) {
              console.log(`    🚩 Red flags: ${dossier.red_flags.join('; ')}`);
            }
          }
        }
      }
    } catch (err) {
      console.error(`  Batch ${i / batchSize + 1}: API error - ${(err as Error).message}`);
      failed += batch.length;
    }

    // Rate limiting
    if (i + batchSize < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 Classification Summary');
  console.log('═'.repeat(60));
  console.log(`  Classified: ${classified}`);
  console.log(`  Failed:     ${failed}`);
  console.log('');
  console.log('Next step: npm run hunt -- --strategy analyze');
  console.log('═'.repeat(60));
}

/**
 * View or update import threshold settings
 */
async function handleThresholds(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const minVolume = values['min-volume'] ? parseInt(values['min-volume'] as string) : undefined;
  const maxDifficulty = values['max-difficulty'] ? parseInt(values['max-difficulty'] as string) : undefined;
  const minCpc = values['min-cpc'] ? parseFloat(values['min-cpc'] as string) : undefined;

  console.log('═'.repeat(60));
  console.log('⚙️  Import Threshold Settings');
  console.log('═'.repeat(60));

  // Get current settings
  const { data: current, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'keyword_import_thresholds')
    .single();

  if (error) {
    console.error('Failed to fetch settings:', error.message);
    process.exit(1);
  }

  const thresholds = (current?.value as Record<string, number | boolean>) || {
    min_volume: 50,
    max_difficulty: 70,
    min_cpc: 0.10,
    skip_informational: true,
  };

  // Check if we're updating
  if (minVolume !== undefined || maxDifficulty !== undefined || minCpc !== undefined) {
    const updated = {
      ...thresholds,
      ...(minVolume !== undefined && { min_volume: minVolume }),
      ...(maxDifficulty !== undefined && { max_difficulty: maxDifficulty }),
      ...(minCpc !== undefined && { min_cpc: minCpc }),
    };

    const { error: updateError } = await supabase
      .from('system_settings')
      .update({ value: updated, updated_at: new Date().toISOString() })
      .eq('key', 'keyword_import_thresholds');

    if (updateError) {
      console.error('Failed to update settings:', updateError.message);
      process.exit(1);
    }

    console.log('');
    console.log('✅ Thresholds updated:');
    console.log('');
    console.log(`  Min Volume:        ${thresholds.min_volume} → ${updated.min_volume}`);
    console.log(`  Max Difficulty:    ${thresholds.max_difficulty} → ${updated.max_difficulty}`);
    console.log(`  Min CPC:           $${thresholds.min_cpc} → $${updated.min_cpc}`);
    console.log(`  Skip Informational: ${updated.skip_informational}`);
  } else {
    console.log('');
    console.log('Current thresholds:');
    console.log('');
    console.log(`  Min Volume:        ${thresholds.min_volume}`);
    console.log(`  Max Difficulty:    ${thresholds.max_difficulty}`);
    console.log(`  Min CPC:           $${thresholds.min_cpc}`);
    console.log(`  Skip Informational: ${thresholds.skip_informational}`);
    console.log('');
    console.log('To update, use:');
    console.log('  npm run hunt -- --strategy thresholds --min-volume 100');
    console.log('  npm run hunt -- --strategy thresholds --max-difficulty 50');
    console.log('  npm run hunt -- --strategy thresholds --min-cpc 0.50');
  }

  console.log('');
  console.log('═'.repeat(60));
}

// =============================================================================
// COMPETITOR INTELLIGENCE
// =============================================================================

/**
 * Import competitor top pages from Ahrefs/SEMrush export
 */
async function handleCompetitorImport(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const filePath = values.file as string;
  const domain = values.domain as string;

  if (!filePath) {
    console.error('Error: --file is required for competitor import');
    console.log('Usage: npm run hunt -- --strategy competitors --file="pages.csv" --domain="example.com"');
    process.exit(1);
  }

  if (!domain) {
    console.error('Error: --domain is required for competitor import');
    console.log('Usage: npm run hunt -- --strategy competitors --file="pages.csv" --domain="example.com"');
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('🕵️  Competitor Intelligence: Top Pages Import');
  console.log('═'.repeat(60));
  console.log(`  Domain: ${domain}`);
  console.log('');

  // Read and parse CSV
  const csvContent = readFileSync(filePath, 'utf-8');
  let records: Array<Record<string, string>>;

  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (err) {
    console.error('Failed to parse CSV:', (err as Error).message);
    process.exit(1);
  }

  console.log(`Found ${records.length} rows in CSV`);

  // Create import batch
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({
      filename: `competitor:${domain}:${filePath.split('/').pop()}`,
      total_rows: records.length,
      status: 'processing',
      notes: `Competitor pages import for ${domain}`,
    })
    .select()
    .single();

  if (batchError) {
    console.error('Failed to create import batch:', batchError.message);
    process.exit(1);
  }

  // Transform to our format
  // Ahrefs columns: #, Traffic, %, Value, Keywords, RD, Page URL, Top keyword, Its volume, Pos.
  const pages = records.map(row => {
    // Parse traffic (might have commas like "1,404")
    const trafficStr = row.Traffic || row.traffic || '0';
    const traffic = parseInt(trafficStr.replace(/,/g, ''), 10);

    // Parse value (might have $ and commas like "$2,796")
    const valueStr = row.Value || row.value || '0';
    const value = parseFloat(valueStr.replace(/[$,]/g, ''));

    return {
      url: row['Page URL'] || row.url || row.URL || '',
      traffic: traffic,
      traffic_share: parseFloat((row['%'] || row.traffic_share || '0').replace('%', '')),
      value: value,
      keywords: parseInt(row.Keywords || row.keywords || '0', 10),
      rd: parseInt(row.RD || row.rd || row['Referring Domains'] || '0', 10),
      top_keyword: row['Top keyword'] || row.top_keyword || row.Keyword || '',
      volume: parseInt((row['Its volume'] || row.volume || row.Volume || '0').replace(/,/g, ''), 10),
      position: parseInt(row['Pos.'] || row.position || row.Position || '0', 10),
    };
  }).filter(p => p.url && p.top_keyword);

  console.log(`Parsed ${pages.length} valid pages`);

  // Call bulk import RPC
  const { data: result, error: importError } = await supabase.rpc('import_competitor_pages', {
    p_competitor_domain: domain,
    p_pages: pages,
    p_batch_id: batch.id,
  });

  if (importError) {
    console.error('Import failed:', importError.message);
    await supabase
      .from('import_batches')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', batch.id);
    process.exit(1);
  }

  const importResult = result as { imported: number; updated: number; competitor_id: string };

  // Update batch status
  await supabase
    .from('import_batches')
    .update({
      imported_rows: importResult.imported,
      duplicate_rows: importResult.updated,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', batch.id);

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 Import Summary');
  console.log('═'.repeat(60));
  console.log(`  Total pages:  ${pages.length}`);
  console.log(`  New:          ${importResult.imported}`);
  console.log(`  Updated:      ${importResult.updated}`);
  console.log('');

  // Show top opportunities
  const { data: topOpportunities } = await supabase
    .from('competitor_opportunities')
    .select('*')
    .eq('competitor', domain)
    .order('opportunity_score', { ascending: false })
    .limit(5);

  if (topOpportunities?.length) {
    console.log('🏆 Top Opportunities:');
    console.log('─'.repeat(60));
    topOpportunities.forEach((opp, i) => {
      console.log(`  ${i + 1}. "${opp.top_keyword}"`);
      console.log(`     Value: $${opp.traffic_value} | Pos: ${opp.their_position} | RD: ${opp.their_rd}`);
      console.log(`     Opportunity: ${opp.opportunity_score} (${opp.opportunity_tier}, ${opp.difficulty})`);
    });
  }

  console.log('');
  console.log('Next step: npm run hunt -- --strategy gaps');
  console.log('═'.repeat(60));
}

/**
 * Show keyword gap analysis vs competitors
 */
async function handleGapAnalysis(
  supabase: ReturnType<typeof createClient>,
  values: Record<string, string | boolean | undefined>
) {
  const limit = parseInt(values.limit as string) || 20;

  console.log('═'.repeat(60));
  console.log('🔍 Keyword Gap Analysis');
  console.log('═'.repeat(60));

  // Get gaps (keywords competitors rank for that we don't have content for)
  const { data: gaps, error } = await supabase
    .from('competitor_keyword_gaps')
    .select('*')
    .eq('our_status', 'gap')
    .order('opportunity_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch gaps:', error.message);
    process.exit(1);
  }

  if (!gaps?.length) {
    console.log('No keyword gaps found.');
    console.log('Import competitor data first: npm run hunt -- --strategy competitors --file="pages.csv" --domain="competitor.com"');
    return;
  }

  console.log(`Found ${gaps.length} keyword gaps`);
  console.log('');

  // Group by tier
  const highValue = gaps.filter(g => g.opportunity_score >= 1000);
  const mediumValue = gaps.filter(g => g.opportunity_score >= 500 && g.opportunity_score < 1000);
  const lowValue = gaps.filter(g => g.opportunity_score < 500);

  if (highValue.length) {
    console.log('🔥 HIGH VALUE GAPS (opportunity ≥ $1000):');
    console.log('─'.repeat(60));
    highValue.slice(0, 10).forEach((gap, i) => {
      console.log(`  ${i + 1}. "${gap.keyword}"`);
      console.log(`     Vol: ${gap.volume} | Value: $${gap.competitor_traffic_value}`);
      console.log(`     Competitor: ${gap.competitor_domain} (pos ${gap.competitor_position}, ${gap.competitor_rd} RD)`);
    });
    console.log('');
  }

  if (mediumValue.length) {
    console.log('💰 MEDIUM VALUE GAPS ($500-$1000):');
    console.log('─'.repeat(60));
    mediumValue.slice(0, 5).forEach((gap, i) => {
      console.log(`  ${i + 1}. "${gap.keyword}" (opp: ${gap.opportunity_score})`);
    });
    console.log('');
  }

  console.log(`📊 Summary: ${highValue.length} high, ${mediumValue.length} medium, ${lowValue.length} low value gaps`);
  console.log('');

  // Offer to create content ideas
  console.log('To add gaps to content pipeline:');
  console.log('  1. Review gaps above');
  console.log('  2. Use admin UI to create content ideas from competitor_opportunities view');
  console.log('  3. Or manually: npm run hunt -- --strategy import --file="selected-gaps.csv"');

  console.log('');
  console.log('═'.repeat(60));
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
