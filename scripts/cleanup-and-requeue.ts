import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupAndRequeue() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Step 1: Finding Reddit Ads and LinkedIn entries...\n');

  // Find entries to delete
  const { data: items, error: findError } = await supabase
    .from('items')
    .select('id, name, website')
    .or('name.ilike.%reddit%,name.ilike.%linkedin%');

  if (findError) {
    console.error('Error finding items:', findError);
    return;
  }

  console.log(`Found ${items?.length || 0} entries:\n`);
  items?.forEach(item => {
    console.log(`  - ${item.name} (${item.id})`);
    console.log(`    Website: ${item.website}\n`);
  });

  // Delete items
  if (items && items.length > 0) {
    console.log('Step 2: Deleting items...\n');

    for (const item of items) {
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        console.error(`Failed to delete ${item.name}:`, deleteError);
      } else {
        console.log(`✓ Deleted: ${item.name}`);
      }
    }
  }

  // Queue new hunts with explicit product names
  console.log('\nStep 3: Queueing new hunts with explicit product names...\n');

  const hunts = [
    {
      tool_name: 'Reddit Ads',
      context_title: 'Google Ads Alternatives',
      priority: 100
    },
    {
      tool_name: 'LinkedIn Ads',
      context_title: 'Google Ads Alternatives',
      priority: 100
    }
  ];

  for (const hunt of hunts) {
    const { data, error } = await supabase
      .from('hunt_queue')
      .insert(hunt)
      .select()
      .single();

    if (error) {
      console.error(`Failed to queue ${hunt.tool_name}:`, error);
    } else {
      console.log(`✓ Queued: ${hunt.tool_name} in "${hunt.context_title}" (priority ${hunt.priority})`);
    }
  }

  console.log('\n✅ Cleanup and re-queue complete!');
}

cleanupAndRequeue();
