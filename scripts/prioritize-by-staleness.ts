import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';
import { buildFreshnessMap } from './lib/hunt-freshness.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function prioritizeByStaleness() {
  // Get all pending queue items
  const { data: queueItems, error: queueError } = await supabase
    .from('hunt_queue')
    .select('id, tool_name, priority')
    .eq('status', 'pending');

  if (queueError) {
    console.error('Queue error:', queueError);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('No pending items in queue');
    return;
  }

  console.log(`\n📋 Prioritizing ${queueItems.length} pending items by canonical freshness...\n`);

  const toolNames = queueItems.map((q) => q.tool_name);
  const freshness = await buildFreshnessMap(supabase, toolNames, { cooldownHours: 24 });

  const prioritized = queueItems.map((q) => {
    const basis = freshness.get(q.tool_name);
    return {
      id: q.id,
      tool_name: q.tool_name,
      currentPriority: q.priority,
      priority: basis?.priority ?? 50,
      ageInDays: basis?.ageDays,
      reason: basis?.reason ?? 'missing_basis',
      basisAt: basis?.freshnessBasisAt ?? null,
      lastTerminalHuntAt: basis?.lastTerminalHuntAt ?? null,
      lastReviewAt: basis?.lastReviewAt ?? null,
    };
  });

  // Sort by priority (highest first)
  prioritized.sort((a, b) => b.priority - a.priority || a.tool_name.localeCompare(b.tool_name));

  console.log('Top 20 items by staleness:');
  prioritized.slice(0, 20).forEach((item, idx) => {
    const ageLabel = item.ageInDays === null ? 'n/a' : `${item.ageInDays}d`;
    const basisLabel = item.basisAt ? item.basisAt.slice(0, 19).replace('T', ' ') : 'none';
    console.log(
      `${(idx + 1).toString().padStart(2)}. ${item.tool_name.padEnd(24)} ${ageLabel.padStart(8)} | ${String(item.currentPriority).padStart(3)} -> ${String(item.priority).padStart(3)} | ${item.reason} | basis=${basisLabel}`
    );
  });

  console.log('\nUpdating priorities in database...');

  // Update priorities in batches
  let updated = 0;
  for (const item of prioritized) {
    const { error } = await supabase
      .from('hunt_queue')
      .update({ priority: item.priority })
      .eq('id', item.id);

    if (!error) updated++;
  }

  console.log(
    `✅ Updated ${updated}/${prioritized.length} queue items with canonical freshness priorities`
  );
}

prioritizeByStaleness();
