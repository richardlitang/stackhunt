import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkReddit() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('items')
    .select('id, name, website, metadata, created_at')
    .ilike('name', '%reddit%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nFound ${data?.length || 0} Reddit entries:\n`);

  for (const item of data || []) {
    console.log('='.repeat(60));
    console.log('ID:', item.id);
    console.log('Name:', item.name);
    console.log('Website:', item.website);
    console.log('Created:', new Date(item.created_at).toISOString());

    const pricing = item.metadata?.smp_pricing;
    if (pricing) {
      console.log('\nPricing:');
      console.log('  Model:', pricing.model);
      console.log('  Confidence:', pricing.confidence);
      console.log('  Plans:', pricing.plans?.length || 0);

      if (pricing.plans && pricing.plans.length > 0) {
        console.log('\n  Plan Details:');
        pricing.plans.forEach((plan: any) => {
          console.log(`    - ${plan.name} (${plan.slug})`);
          console.log(`      Price: ${plan.price_display || 'custom'}`);
          console.log(`      Audience: ${plan.target_audience || 'not set'}`);
        });
      }
    }

    const taxonomy = item.metadata?.smp_taxonomy;
    if (taxonomy) {
      console.log('\nTaxonomy:');
      console.log('  Primary:', taxonomy.primary_category);
      console.log('  Secondary:', taxonomy.secondary_categories?.join(', ') || 'none');
    }

    console.log('');
  }
}

checkReddit();
