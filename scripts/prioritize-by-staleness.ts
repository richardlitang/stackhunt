import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function prioritizeByStleness() {
  // Get all pending queue items
  const { data: queueItems, error: queueError } = await supabase
    .from('hunt_queue')
    .select('id, tool_name')
    .eq('status', 'pending');

  if (queueError) {
    console.error('Queue error:', queueError);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('No pending items in queue');
    return;
  }

  console.log(`\n📋 Prioritizing ${queueItems.length} pending items by staleness...\n`);

  // Get updated_at for all these items
  const toolNames = queueItems.map(q => q.tool_name);
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('name, updated_at')
    .in('name', toolNames);

  if (itemsError) {
    console.error('Items error:', itemsError);
    return;
  }

  // Create map of tool name to updated_at
  const updateMap = new Map(items?.map(i => [i.name, new Date(i.updated_at).getTime()]) || []);

  // Calculate staleness score for each queue item
  const now = Date.now();
  const prioritized = queueItems.map(q => {
    const lastUpdate = updateMap.get(q.tool_name) || now;
    const ageInDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);

    // Priority: 100 for items >30 days old, down to 50 for items <1 day old
    const priority = Math.min(100, Math.max(50, Math.floor(50 + ageInDays)));

    return {
      id: q.id,
      tool_name: q.tool_name,
      ageInDays: Math.floor(ageInDays),
      priority,
    };
  });

  // Sort by priority (highest first)
  prioritized.sort((a, b) => b.priority - a.priority);

  console.log('Top 20 items by staleness:');
  prioritized.slice(0, 20).forEach((item, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. ${item.tool_name.padEnd(30)} - ${item.ageInDays}d old → priority ${item.priority}`);
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

  console.log(`✅ Updated ${updated}/${prioritized.length} queue items with staleness-based priorities`);
}

prioritizeByStleness();
