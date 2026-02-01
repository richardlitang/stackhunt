import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function requeueZoho() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Updating Zoho Projects to low priority and resetting status...\n');

  const { data, error } = await supabase
    .from('hunt_queue')
    .update({
      priority: 1,  // Low priority - back of queue
      status: 'pending'  // Reset to pending
    })
    .eq('tool_name', 'Zoho Projects')
    .is('context_title', null)
    .select()
    .single();

  if (error) {
    console.error('Error queueing:', error);
    return;
  }

  console.log('✅ Queued successfully:');
  console.log(`   Tool: ${data.tool_name}`);
  console.log(`   Priority: ${data.priority}`);
  console.log(`   ID: ${data.id}`);
}

requeueZoho();
