import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function identifyNewItems() {
  // Get all pending queue items
  const { data: queueItems, error: queueError } = await supabase
    .from('hunt_queue')
    .select('id, tool_name, priority, created_at')
    .eq('status', 'pending')
    .order('priority', { ascending: false });

  if (queueError) {
    console.error('Queue error:', queueError);
    return;
  }

  console.log(`\n📋 Analyzing ${queueItems?.length} pending queue items...\n`);

  // Check which ones exist in items table
  const toolNames = queueItems?.map(q => q.tool_name) || [];
  const { data: existingItems, error: itemsError } = await supabase
    .from('items')
    .select('name, updated_at')
    .in('name', toolNames);

  if (itemsError) {
    console.error('Items error:', itemsError);
    return;
  }

  const existingSet = new Set(existingItems?.map(i => i.name) || []);

  const newItems = queueItems?.filter(q => !existingSet.has(q.tool_name)) || [];
  const existingQueueItems = queueItems?.filter(q => existingSet.has(q.tool_name)) || [];

  console.log(`✨ NEW items (never processed): ${newItems.length}`);
  newItems.forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.tool_name} (priority: ${item.priority})`);
  });

  console.log(`\n🔄 EXISTING items (re-process from old batches): ${existingQueueItems.length}`);
  existingQueueItems.slice(0, 10).forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.tool_name} (priority: ${item.priority})`);
  });
  if (existingQueueItems.length > 10) {
    console.log(`  ... and ${existingQueueItems.length - 10} more`);
  }

  return { newItems, existingQueueItems };
}

identifyNewItems();
