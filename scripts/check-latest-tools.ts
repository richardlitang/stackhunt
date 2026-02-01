import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkLatestTools() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('items')
    .select('id, name, website, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📦 Latest Tools (Last 25):\n');

  data?.forEach((item, idx) => {
    const pricing = item.metadata?.smp_pricing;
    const created = new Date(item.created_at).toLocaleString();

    console.log(`${idx + 1}. ${item.name}`);
    console.log(`   Created: ${created}`);
    console.log(`   Website: ${item.website}`);
    if (pricing) {
      console.log(`   Model: ${pricing.model}, Plans: ${pricing.plans?.length || 0}, Confidence: ${pricing.confidence}`);
    }
    console.log('');
  });
}

checkLatestTools();
