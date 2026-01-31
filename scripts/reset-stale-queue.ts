import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetStaleItems() {
  // Find items in processing status with heartbeat older than 1 minute
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

  const { data: staleItems, error: fetchError } = await supabase
    .from('hunt_queue')
    .select('id, tool_name, heartbeat_at')
    .eq('status', 'processing')
    .lt('heartbeat_at', oneMinuteAgo);

  if (fetchError) {
    console.error('Error fetching stale items:', fetchError);
    return;
  }

  if (!staleItems || staleItems.length === 0) {
    console.log('✅ No stale items found');
    return;
  }

  console.log(`\n🔄 Found ${staleItems.length} stale items to reset:\n`);

  for (const item of staleItems) {
    const heartbeatAge = item.heartbeat_at
      ? Math.floor((Date.now() - new Date(item.heartbeat_at).getTime()) / 1000)
      : null;
    console.log(`  - ${item.tool_name} (heartbeat: ${heartbeatAge}s ago)`);
  }

  console.log('\nResetting to pending status...');

  const { error: updateError } = await supabase
    .from('hunt_queue')
    .update({
      status: 'pending',
      claimed_by: null,
      claimed_at: null,
      started_at: null,
    })
    .eq('status', 'processing')
    .lt('heartbeat_at', oneMinuteAgo);

  if (updateError) {
    console.error('Error updating items:', updateError);
    return;
  }

  console.log(`\n✅ Reset ${staleItems.length} items to pending status`);
}

resetStaleItems();
