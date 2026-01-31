#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Applying Migration 030: Parent/Child Relationship\n');

// Step 1: Check if column already exists
console.log('[1/3] Checking if parent_id column exists...');
const { data: existingColumns } = await supabase
  .from('items')
  .select('*')
  .limit(1);

if (existingColumns && existingColumns[0] && 'parent_id' in existingColumns[0]) {
  console.log('✅ Column parent_id already exists. Migration already applied.\n');
  process.exit(0);
}

console.log('Column does not exist. Proceeding with migration...\n');

// Step 2: Use raw SQL via PostgREST (if available)
// Note: This requires the database to be accessible
const migrationSQL = `
ALTER TABLE items ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE SET NULL;
CREATE INDEX idx_items_parent_id ON items(parent_id);
COMMENT ON COLUMN items.parent_id IS 'References parent suite for bundled tools. NULL for standalone tools.';
`;

console.log('[2/3] Executing migration SQL...\n');
console.log('⚠️  Cannot execute DDL via Supabase JS client.');
console.log('Please run this SQL manually in Supabase Dashboard:\n');
console.log('─'.repeat(70));
console.log(migrationSQL);
console.log('─'.repeat(70));
console.log('\n📍 URL: https://supabase.com/dashboard/project/yjtsyvzhplcwvfbkzcjt/sql/new\n');

process.exit(1);
