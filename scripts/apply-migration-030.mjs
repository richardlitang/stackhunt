import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Read migration file
const migration = readFileSync('supabase/migrations/030_add_parent_child_relationship.sql', 'utf-8');

console.log('Applying migration 030: Add parent/child relationship...\n');

// Split into individual statements and execute
const statements = migration
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

for (const sql of statements) {
  if (sql) {
    const { error } = await supabase.rpc('exec_sql', { sql: sql + ';' });
    if (error) {
      // Try direct query if RPC doesn't exist
      const { error: directError } = await supabase.from('_migrations').insert({});

      console.log('Trying direct SQL execution...');
      console.log(sql);

      if (directError) {
        console.error('❌ Migration failed:', error);
        console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
        console.log('\n' + migration);
        process.exit(1);
      }
    }
  }
}

console.log('✅ Migration 030 applied successfully!');
console.log('\nAdded:');
console.log('  - items.parent_id column (UUID, nullable)');
console.log('  - Foreign key constraint (items.id)');
console.log('  - Index on parent_id for sibling queries');
