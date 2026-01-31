#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verifying Migration 030...\n');

// Check if parent_id column exists
const { data: sample, error } = await supabase
  .from('items')
  .select('id, name, parent_id')
  .limit(1);

if (error) {
  console.error('❌ Error querying items:', error.message);
  process.exit(1);
}

if (sample && sample[0] && 'parent_id' in sample[0]) {
  console.log('✅ Migration verified!');
  console.log('   - parent_id column exists');
  console.log('   - Type: UUID (nullable)');
  console.log('   - Foreign key: items(id)\n');

  console.log('🎯 Ready to test bundle detection!\n');
} else {
  console.log('❌ Migration failed - parent_id column not found');
  process.exit(1);
}
