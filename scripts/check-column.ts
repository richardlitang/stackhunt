#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // Check if column exists
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'items')
    .eq('column_name', 'review_context');

  console.log('✅ Column exists:', columns?.length ? 'YES' : 'NO', columns);

  // Check Microsoft 365 data directly
  const { data: item, error } = await supabase
    .from('items')
    .select('name, review_context, specs')
    .eq('name', 'Microsoft 365')
    .single();

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('\n📦 Microsoft 365 Data:');
  console.log('  review_context column:', item?.review_context ? 'HAS DATA' : 'NULL');
  console.log('  specs.review_context:', item?.specs?.review_context ? 'HAS DATA' : 'NULL/MISSING');

  if (item?.review_context) {
    console.log('\n✅ review_context (top-level column):');
    console.log(JSON.stringify(item.review_context, null, 2));
  }

  if (item?.specs?.review_context) {
    console.log('\n✅ specs.review_context (inside JSONB specs):');
    console.log(JSON.stringify(item.specs.review_context, null, 2));
  }
}

check();
