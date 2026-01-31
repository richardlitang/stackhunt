#!/usr/bin/env node
/**
 * Apply migration 030: Add parent/child relationship
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Applying Migration 030: Parent/Child Relationship\n');

// Read migration SQL
const migrationSQL = readFileSync('supabase/migrations/030_add_parent_child_relationship.sql', 'utf-8');

// Extract individual statements (split by semicolon, filter comments)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s !== '');

console.log(`Found ${statements.length} SQL statements to execute\n`);

let successCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i] + ';';

  console.log(`[${i + 1}/${statements.length}] Executing...`);

  try {
    // Execute raw SQL via Postgres
    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      throw error;
    }

    console.log('✅ Success\n');
    successCount++;

  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('\nStatement:', statement);
    console.error('\n⚠️  Migration incomplete. Please run the following SQL manually in Supabase:');
    console.error('\n' + migrationSQL);
    process.exit(1);
  }
}

console.log(`\n✅ Migration complete! ${successCount}/${statements.length} statements executed successfully.\n`);
console.log('Changes applied:');
console.log('  • Added items.parent_id column (UUID, nullable)');
console.log('  • Added foreign key constraint (items.id)');
console.log('  • Created index on parent_id for sibling queries\n');
console.log('Next steps:');
console.log('  1. Test bundled tool: npm run hunt -- --tool="Google Calendar"');
console.log('  2. Verify parent_id is set');
console.log('  3. Check embedding includes "Part of [Suite]"\n');
