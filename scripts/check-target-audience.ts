#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase
    .from('items')
    .select('name, specs')
    .in('name', ['Teamhood', 'Basecamp', 'Microsoft Teams'])
    .limit(3);

  for (const item of data || []) {
    console.log(`\n${item.name}:`);
    console.log('  specs keys:', Object.keys(item.specs || {}).join(', '));

    // Check smp_pricing path
    if (item.specs?.smp_pricing) {
      console.log('  ✓ Has specs.smp_pricing');
      console.log('    Keys:', Object.keys(item.specs.smp_pricing).join(', '));
      const plans = item.specs.smp_pricing.pricing_data?.plans || item.specs.smp_pricing.plans || [];
      console.log(`    Plans: ${plans.length}`);
    }

    // Check pricing_data path
    if (item.specs?.pricing_data) {
      console.log('  ✓ Has specs.pricing_data');
      console.log('    Keys:', Object.keys(item.specs.pricing_data).join(', '));
      const plans = item.specs.pricing_data.plans || [];
      console.log(`    Plans: ${plans.length}`);
      if (plans.length > 0) {
        console.log('    First plan:', plans[0].name);
        console.log('    Has target_audience?', 'target_audience' in plans[0]);
      }
    }
  }
}

check();
