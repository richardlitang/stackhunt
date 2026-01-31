#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Applying migration: Add parent/child relationship...\n');

try {
  // Add parent_id column
  await supabase.rpc('exec', {
    sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES items(id) ON DELETE SET NULL;'
  }).throwOnError();

  console.log('✅ Added parent_id column');

  // Add index
  await supabase.rpc('exec', {
    sql: 'CREATE INDEX IF NOT EXISTS idx_items_parent_id ON items(parent_id);'
  }).throwOnError();

  console.log('✅ Created index on parent_id');

  console.log('\n✅ Migration complete!');
  console.log('\nNext steps:');
  console.log('  1. Test on bundled tool: npm run hunt -- --tool="Google Calendar"');
  console.log('  2. Check parent_id is set correctly');
  console.log('  3. Verify embedding includes "Part of [Suite]"');

} catch (error) {
  console.error('\n❌ Migration failed. Please run this SQL manually in Supabase SQL Editor:');
  console.error('\n--- SQL ---');
  console.error(`
ALTER TABLE items
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_items_parent_id ON items(parent_id);

COMMENT ON COLUMN items.parent_id IS 'References parent suite for bundled tools. NULL for standalone tools.';
  `);
  console.error('\n--- Error ---');
  console.error(error);
  process.exit(1);
}
