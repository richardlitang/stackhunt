import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProcessing() {
  const { data, error } = await supabase
    .from('hunt_queue')
    .select('id, tool_name, status, heartbeat_at')
    .eq('status', 'processing')
    .order('heartbeat_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n🔄 Processing Status: ${data.length} items currently processing\n`);

  if (data.length > 0) {
    data.forEach((item) => {
      const heartbeatAge = item.heartbeat_at
        ? Math.floor((Date.now() - new Date(item.heartbeat_at).getTime()) / 1000)
        : null;
      console.log(`  - ${item.tool_name} (heartbeat: ${heartbeatAge}s ago)`);
    });
  }
}

checkProcessing();
