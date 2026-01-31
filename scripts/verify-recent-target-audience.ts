import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyRecent() {
  // Get items updated in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, specs, updated_at')
    .gte('updated_at', tenMinutesAgo)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n✅ Checking ${items?.length} items updated in last 10 minutes:\n`);

  for (const item of items || []) {
    const updateTime = new Date(item.updated_at).toLocaleTimeString();
    console.log(`\n${item.name} (${updateTime}):`);

    const pricingData = (item.specs as any)?.pricing_data;

    if (!pricingData?.plans || pricingData.plans.length === 0) {
      console.log('  ⚠️  No plans found');
      continue;
    }

    let hasTargetAudience = 0;
    let totalPlans = pricingData.plans.length;

    pricingData.plans.forEach((plan: any, idx: number) => {
      const ta = plan.target_audience;
      const hasTA = ta && ta !== 'null' && ta !== false;
      if (hasTA) hasTargetAudience++;

      console.log(`  Plan ${idx + 1}: ${plan.name || 'unnamed'}`);
      console.log(`    target_audience: ${ta || 'MISSING'} ${hasTA ? '✅' : '❌'}`);
    });

    const coverage = Math.round((hasTargetAudience / totalPlans) * 100);
    console.log(`  📊 Coverage: ${hasTargetAudience}/${totalPlans} (${coverage}%)`);
  }
}

verifyRecent();
