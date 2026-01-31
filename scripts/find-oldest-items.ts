import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findOldestItems() {
  // Get items in queue
  const { data: queueItems, error: queueError } = await supabase
    .from('hunt_queue')
    .select('tool_name, status, priority')
    .eq('status', 'pending')
    .order('priority', { ascending: false });

  if (queueError) {
    console.error('Queue error:', queueError);
    return;
  }

  const queuedToolNames = new Set(queueItems?.map(q => q.tool_name) || []);

  // Get oldest items (by updated_at)
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📅 Oldest items that need updating:\n');

  const now = Date.now();
  items?.forEach((item, idx) => {
    const age = Math.floor((now - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24));
    const inQueue = queuedToolNames.has(item.name);
    console.log(`${idx + 1}. ${item.name.padEnd(30)} - ${age}d ago ${inQueue ? '✓ queued' : '❌ NOT queued'}`);
  });

  // Count how many oldest items are NOT in queue
  const notQueued = items?.filter(item => !queuedToolNames.has(item.name)) || [];
  console.log(`\n⚠️  ${notQueued.length} of the 50 oldest items are NOT in the queue`);
}

findOldestItems();
