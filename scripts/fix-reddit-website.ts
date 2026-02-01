import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixRedditWebsite() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Updating Reddit Ads website to business.reddit.com...\n');

  const { data, error } = await supabase
    .from('items')
    .update({ website: 'https://business.reddit.com/' })
    .eq('id', 'c35815ed-f09f-41b5-bd1f-f888c6b215d4')
    .select('id, name, website');

  if (error) {
    console.error('Error updating:', error);
    return;
  }

  console.log('✅ Updated successfully:');
  console.log(`   Name: ${data[0].name}`);
  console.log(`   Website: ${data[0].website}`);
}

fixRedditWebsite();
