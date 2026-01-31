/**
 * Smart Queue Content Ideas Script
 * Promotes content_ideas to hunt_queue using Gemini-powered keyword parsing
 *
 * Usage:
 *   npx tsx scripts/queue-content-ideas-smart.ts [options]
 *
 * Options:
 *   --limit N          Max number to queue (default: 10)
 *   --dry-run          Analyze only, don't queue
 *   --test             Test with specific keywords
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { parseKeywordIntent } from '../src/lib/hunter/services/keyword-parser.js';
import { executeFlywheel } from '../src/lib/hunter/services/flywheel.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ContentIdea {
  id: string;
  keyword: string;
  tool_name?: string | null;
  context_query?: string | null;
  roi_score?: number;
  status: string;
}

async function queueContentIdeasSmart() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const testMode = args.includes('--test');

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 10;

  console.log('🎯 Smart Queue Content Ideas (Gemini-Powered)');
  console.log('━'.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit}`);
  console.log('');

  // Fetch pending content ideas
  const { data: ideas, error } = await supabase
    .from('content_ideas')
    .select('*')
    .eq('status', 'pending')
    .order('roi_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Failed to fetch content ideas:', error.message);
    process.exit(1);
  }

  if (!ideas || ideas.length === 0) {
    console.log('✓ No pending content ideas to queue');
    process.exit(0);
  }

  console.log(`Found ${ideas.length} pending content ideas:\n`);

  let queued = 0;
  let skipped = 0;
  let failed = 0;
  let totalActions = 0;

  for (const idea of ideas as ContentIdea[]) {
    console.log(`\n📌 "${idea.keyword}"`);
    console.log(`   ROI Score: ${idea.roi_score || 0}`);

    try {
      // Parse keyword with Gemini
      console.log('   🤖 Analyzing with Gemini...');
      const intent = await parseKeywordIntent(idea.keyword);

      console.log(`   ✅ Type: ${intent.type}`);
      console.log(`   ✅ Tools: ${intent.tools.join(', ')}`);
      console.log(`   ✅ Context: ${intent.context || 'none'}`);
      console.log(`   ✅ Category: ${intent.category || 'none'}`);
      console.log(`   ✅ Actions: ${intent.actionPlan.length} steps`);

      if (dryRun) {
        console.log('   📋 Action Plan:');
        intent.actionPlan.forEach((action, idx) => {
          console.log(`     ${idx + 1}. ${action.type}`);
          console.log(`        ${JSON.stringify(action.params)}`);
        });
        queued++;
        totalActions += intent.actionPlan.length;
        continue;
      }

      // Execute action plan
      let actionsExecuted = 0;
      for (const action of intent.actionPlan) {
        try {
          await executeAction(action, idea.id, idea.keyword);
          actionsExecuted++;
        } catch (actionError: any) {
          console.log(`     ⚠️  ${action.type} failed: ${actionError.message}`);
        }
      }

      if (actionsExecuted > 0) {
        // Update content_ideas with parsed metadata
        await supabase
          .from('content_ideas')
          .update({
            status: 'queued',
            // Store parsed data (if columns exist)
            // keyword_type: intent.type,
            // extracted_tools: intent.tools,
          })
          .eq('id', idea.id);

        console.log(`   ✅ Queued ${actionsExecuted} actions`);
        queued++;
        totalActions += actionsExecuted;
      } else {
        console.log('   ⚠️  No actions executed');
        skipped++;
      }

    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('Summary:');
  console.log(`✅ Queued: ${queued} ideas → ${totalActions} actions`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  if (!dryRun && queued > 0) {
    console.log('🚀 Run queue worker to process queued items');
    console.log('   npx tsx scripts/queue-worker.ts --batch=20 --once');
  }
}

async function executeAction(action: any, contentIdeaId: string, keyword?: string) {
  switch (action.type) {
    case 'hunt_tool':
      await queueToolHunt(action.params.tool_name, contentIdeaId);
      break;

    case 'create_context':
      // FLYWHEEL ARCHITECTURE: Execute Phase 1 + Phase 2
      if (keyword) {
        console.log(`     🌀 Executing Flywheel Architecture...`);
        const result = await executeFlywheel(
          {
            title: action.params.context_title,
            slug: action.params.context_title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
          },
          keyword,
          supabase
        );
        console.log(`     ✅ Phase 1: ${result.phase1.existing_tools_count} existing tools reviewed`);
        console.log(`     ✅ Phase 2: ${result.phase2.new_hunts_queued} new hunts queued`);
      } else {
        await createContext(action.params.context_title, contentIdeaId);
      }
      break;

    case 'review_existing_tools':
      console.log(`     📝 Existing tools will be auto-reviewed in context`);
      break;

    case 'discover_new_tools':
      console.log(`     🔍 New tools discovered via Flywheel (see Phase 2 above)`);
      break;

    case 'create_comparison':
      await queueComparison(action.params.tools, contentIdeaId);
      break;

    case 'discover_competitors':
      await discoverCompetitors(action.params.anchor_tool);
      break;

    case 'review_in_context':
      console.log(`     📝 review_in_context (will be created after hunts complete)`);
      break;

    default:
      console.log(`     ⚠️  Unknown action type: ${action.type}`);
  }
}

async function queueToolHunt(toolName: string, contentIdeaId: string) {
  // Check if already in queue or DB
  const { data: existingQueue } = await supabase
    .from('hunt_queue')
    .select('id')
    .eq('tool_name', toolName)
    .in('status', ['pending', 'processing'])
    .single();

  if (existingQueue) {
    console.log(`     ⏭️  ${toolName} already in queue`);
    return;
  }

  const { data: existingTool } = await supabase
    .from('items')
    .select('id')
    .eq('name', toolName)
    .single();

  if (existingTool) {
    console.log(`     ✓ ${toolName} already in DB`);
    return;
  }

  // Queue the hunt
  const { error } = await supabase
    .from('hunt_queue')
    .insert({
      tool_name: toolName,
      hunt_type: 'full',
      priority: 50,
      source: 'suggestion',
      status: 'pending',
    });

  if (error) {
    throw new Error(`Failed to queue ${toolName}: ${error.message}`);
  }

  console.log(`     ✅ Queued hunt: ${toolName}`);
}

async function createContext(contextTitle: string, contentIdeaId: string) {
  // Check if context already exists
  const slug = contextTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data: existing } = await supabase
    .from('contexts')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    console.log(`     ✓ Context already exists: ${contextTitle}`);
    return;
  }

  // Create context
  const { error } = await supabase
    .from('contexts')
    .insert({
      title: contextTitle,
      slug,
      status: 'draft',
    });

  if (error) {
    throw new Error(`Failed to create context: ${error.message}`);
  }

  console.log(`     ✅ Created context: ${contextTitle}`);
}

async function queueComparison(tools: string[], contentIdeaId: string) {
  if (tools.length !== 2) {
    console.log(`     ⚠️  Comparison requires exactly 2 tools, got ${tools.length}`);
    return;
  }

  // Queue both tools first
  for (const tool of tools) {
    await queueToolHunt(tool, contentIdeaId);
  }

  console.log(`     📊 Comparison will be created after both tools are hunted`);
}

async function discoverCompetitors(anchorTool: string) {
  // Check if anchor tool exists in DB
  const { data: tool } = await supabase
    .from('items')
    .select('name, specs')
    .eq('name', anchorTool)
    .single();

  if (!tool) {
    console.log(`     ⚠️  Anchor tool ${anchorTool} not in DB, will queue it first`);
    return;
  }

  const specs = tool.specs as any;
  const competitors = specs?.competitors || [];

  if (competitors.length === 0) {
    console.log(`     ⚠️  No competitors found for ${anchorTool}`);
    return;
  }

  console.log(`     🔍 Found ${competitors.length} competitors: ${competitors.slice(0, 3).join(', ')}...`);
}

queueContentIdeasSmart().catch(console.error);
