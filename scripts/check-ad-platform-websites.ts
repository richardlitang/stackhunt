import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAdPlatforms() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all items with ad_spend or per_unit pricing model
  const { data, error } = await supabase
    .from('items')
    .select('id, name, website, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\nAd Platform Websites:\n');

  const adPlatforms = (data || []).filter((item: any) => {
    const model = item.metadata?.smp_pricing?.model;
    return model === 'ad_spend' ||
           (model === 'per_unit' && item.name.toLowerCase().includes('ads'));
  });

  for (const item of adPlatforms) {
    const pricing = item.metadata?.smp_pricing;
    console.log('─'.repeat(60));
    console.log(`Name: ${item.name}`);
    console.log(`Website: ${item.website}`);
    console.log(`Model: ${pricing?.model}`);
    console.log(`Created: ${new Date(item.created_at).toLocaleDateString()}`);
    console.log('');
  }
}

checkAdPlatforms();
