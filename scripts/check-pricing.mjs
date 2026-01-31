import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('items')
  .select('name, specs, knowledge_card')
  .in('name', ['Google Meet', 'Slack'])
  .order('name');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

for (const item of data) {
  console.log('\n═══════════════════════════════════════');
  console.log('📦', item.name);
  console.log('═══════════════════════════════════════');

  // Check knowledge_card (new schema)
  if (item.knowledge_card?.smp_pricing) {
    const pricing = item.knowledge_card.smp_pricing;
    console.log('\n💰 Model:', pricing.pricing_model);
    console.log('\n📝 Analysis Log:');
    console.log(pricing.pricing_analysis_log || 'N/A');

    if (pricing.plans?.length > 0) {
      console.log(`\n📊 Plans (${pricing.plans.length}):`);
      pricing.plans.forEach(plan => {
        const price = plan.price_monthly || 0;
        const unit = plan.scaling_unit ? `/${plan.scaling_unit}` : '';
        console.log(`  - ${plan.plan_name}: $${price}/mo${unit}`);
      });
    }
  }
  // Fallback to old schema
  else if (item.specs?.pricing_data) {
    console.log('\n💰 Old pricing_data found');
    console.log(JSON.stringify(item.specs.pricing_data, null, 2).slice(0, 500));
  } else {
    console.log('\n⚠️ No pricing data found');
  }
}
