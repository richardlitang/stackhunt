import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkQueueStatus() {
  const { data, error } = await supabase
    .from('hunt_queue')
    .select('id, tool_name, status, priority')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📋 Queue Status: ${data.length} pending items\n`);

  if (data.length > 0) {
    console.log('Next items to process:');
    data.slice(0, 10).forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.tool_name} (priority: ${item.priority})`);
    });

    if (data.length > 10) {
      console.log(`  ... and ${data.length - 10} more`);
    }
  }
}

checkQueueStatus();
