import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Delete test tools
const { error } = await supabase
  .from('items')
  .delete()
  .in('name', ['Google Meet', 'Slack']);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ Deleted Google Meet and Slack for fresh testing');
