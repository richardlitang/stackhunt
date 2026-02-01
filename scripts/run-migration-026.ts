import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('\n🔧 Running Migration 026: Unify Review Schema\n');

  const migrationSQL = fs.readFileSync(
    '/Users/richardlitang/code/personal/stackhunt/supabase/migrations/026_unify_review_schema.sql',
    'utf-8'
  );

  // Split into individual statements and execute each
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== 'ANALYZE reviews');

  console.log(`Executing ${statements.length} SQL statements...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;

    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      // Try using rpc with admin privileges
      const { error } = await supabase.rpc('exec_sql', {
        query: stmt + ';'
      });

      if (error) {
        // If rpc doesn't exist, try direct query (won't work for DDL)
        console.log(`   ⚠️  Skipping (requires DDL): ${error.message}`);
        failCount++;
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed/skipped`);

  if (failCount > 0) {
    console.log('\n⚠️  Some statements failed - manual execution required');
    console.log('Run this in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard → SQL Editor → New Query');
    console.log('\nOr use this command:');
    console.log('cat supabase/migrations/026_unify_review_schema.sql | pbcopy');
  } else {
    // Check results
    const { count: totalReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });

    const { count: discoveryReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .is('context_id', null);

    console.log('\n✅ Migration Complete!');
    console.log(`   Total reviews: ${totalReviews}`);
    console.log(`   Discovery reviews: ${discoveryReviews}`);
  }
}

runMigration();
