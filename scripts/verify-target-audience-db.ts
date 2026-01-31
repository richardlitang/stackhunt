import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyTargetAudience() {
  // Get recently updated items
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, specs, updated_at')
    .in('name', ['Midjourney', 'Ahrefs', 'Mercury', 'Cursor', 'Toggl', 'DaVinci Resolve'])
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 Checking ${items?.length} recently processed items:\n`);

  for (const item of items || []) {
    console.log(`\n${item.name} (updated: ${new Date(item.updated_at).toLocaleString()}):`);

    const pricingData = (item.specs as any)?.pricing_data;

    if (!pricingData) {
      console.log('  ❌ No pricing_data found');
      continue;
    }

    if (!pricingData.plans || pricingData.plans.length === 0) {
      console.log('  ❌ No plans found');
      continue;
    }

    console.log(`  Plans: ${pricingData.plans.length}`);

    pricingData.plans.forEach((plan: any, idx: number) => {
      const hasTargetAudience = plan.target_audience !== undefined && plan.target_audience !== null && plan.target_audience !== false;
      console.log(`    Plan ${idx + 1}: ${plan.name || 'unnamed'}`);
      console.log(`      target_audience: ${plan.target_audience || 'MISSING'} ${hasTargetAudience ? '✓' : '❌'}`);
    });
  }
}

verifyTargetAudience();
