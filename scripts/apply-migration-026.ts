import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function applyMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('\n🔧 Applying Migration 026: Unify Review Schema\n');

  const migration = fs.readFileSync(
    '/Users/richardlitang/code/personal/stackhunt/supabase/migrations/026_unify_review_schema.sql',
    'utf-8'
  );

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: migration });

    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }

    console.log('✅ Migration applied successfully!');

    // Check results
    const { data: reviewCount } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true });

    const { data: orphanedCount } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .is('context_id', null);

    console.log('\n📊 Results:');
    console.log(`   Total reviews: ${reviewCount || 0}`);
    console.log(`   Discovery reviews (context_id = NULL): ${orphanedCount || 0}`);

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

applyMigration();
