/**
 * Queue Content Ideas Script
 * Promotes approved content_ideas to hunt_queue for processing
 *
 * Usage:
 *   npx tsx scripts/queue-content-ideas.ts [options]
 *
 * Options:
 *   --all              Queue all pending ideas
 *   --min-priority N   Only queue ideas with priority >= N (default: 80)
 *   --limit N          Max number to queue (default: 10)
 *   --auto             Auto-approve and queue high priority items
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

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
  tool_name: string | null;
  context_query: string | null;
  priority: number;
  pillar: string | null;
  target_audience: string | null;
  content_type: string | null;
  notes: string | null;
}

async function queueContentIdeas() {
  const args = process.argv.slice(2);
  const queueAll = args.includes('--all');
  const autoMode = args.includes('--auto');

  const minPriorityIdx = args.indexOf('--min-priority');
  const minPriority = minPriorityIdx >= 0 ? parseInt(args[minPriorityIdx + 1], 10) : 80;

  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 10;

  console.log('🎯 Queuing Content Ideas to Hunt Queue');
  console.log('━'.repeat(50));
  console.log(`Mode: ${autoMode ? 'AUTO' : 'MANUAL'}`);
  console.log(`Min Priority: ${minPriority}`);
  console.log(`Limit: ${limit}`);
  console.log('');

  // Fetch content ideas that are ready to queue
  let query = supabase
    .from('content_ideas')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(limit);

  if (!queueAll) {
    query = query.gte('priority', minPriority);
  }

  const { data: ideas, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch content ideas:', error.message);
    process.exit(1);
  }

  if (!ideas || ideas.length === 0) {
    console.log('✓ No content ideas to queue');
    process.exit(0);
  }

  console.log(`Found ${ideas.length} content ideas to process:\n`);

  let queued = 0;
  let skipped = 0;
  let failed = 0;

  for (const idea of ideas as ContentIdea[]) {
    console.log(`📌 ${idea.context_query || idea.keyword}`);
    console.log(`   Priority: ${idea.priority} | Tool: ${idea.tool_name || 'auto-discover'}`);

    try {
      // Check if already in queue
      const { data: existing } = await supabase
        .from('hunt_queue')
        .select('id')
        .eq('tool_name', idea.tool_name || idea.keyword)
        .eq('context_title', idea.context_query || idea.keyword)
        .in('status', ['pending', 'claimed', 'processing'])
        .single();

      if (existing) {
        console.log('   ⏭️  Already in queue, skipping');
        skipped++;
        continue;
      }

      // Add to hunt queue
      const { error: insertError } = await supabase
        .from('hunt_queue')
        .insert({
          tool_name: idea.tool_name || idea.keyword,
          context_title: idea.context_query || idea.keyword,
          hunt_type: 'full',
          priority: Math.min(idea.priority, 100),
          source: 'suggestion',
          status: 'pending',
        });

      if (insertError) {
        console.log(`   ❌ Failed: ${insertError.message}`);
        failed++;
        continue;
      }

      // Update content_ideas status to 'queued'
      await supabase
        .from('content_ideas')
        .update({ status: 'queued' })
        .eq('id', idea.id);

      console.log('   ✅ Queued successfully');
      queued++;

    } catch (err) {
      console.log(`   ❌ Error: ${err}`);
      failed++;
    }

    console.log('');
  }

  console.log('━'.repeat(50));
  console.log('Summary:');
  console.log(`✅ Queued: ${queued}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('');

  if (queued > 0) {
    console.log('🚀 Run the hunter to process queued items');
  }
}

queueContentIdeas().catch(console.error);
