import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
  // Use admin API endpoint for DDL operations
  const projectRef = process.env.SUPABASE_URL!.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error('Could not extract project ref from SUPABASE_URL');
    return;
  }

  const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const migrations = [
    {
      name: 'Make context_id nullable',
      sql: 'ALTER TABLE reviews ALTER COLUMN context_id DROP NOT NULL;'
    },
    {
      name: 'Drop unique constraint',
      sql: 'ALTER TABLE reviews DROP CONSTRAINT IF EXISTS unique_item_context;'
    },
    {
      name: 'Add conditional unique index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS unique_item_context_not_null
            ON reviews(item_id, context_id)
            WHERE context_id IS NOT NULL;`
    },
    {
      name: 'Add quality column',
      sql: `ALTER TABLE reviews
            ADD COLUMN IF NOT EXISTS quality TEXT CHECK (quality IN ('high', 'medium', 'low'));`
    },
    {
      name: 'Migrate orphaned reviews',
      sql: `INSERT INTO reviews (item_id, context_id, score, pros, cons, quality, status, created_at, updated_at)
            SELECT
              i.id as item_id,
              NULL as context_id,
              COALESCE((i.metadata->'analysis'->>'score')::int, (i.metadata->'user_advocate'->>'score')::int, NULL) as score,
              COALESCE(i.specs->'pros', '[]'::jsonb) as pros,
              COALESCE(i.specs->'cons', '[]'::jsonb) as cons,
              COALESCE(i.metadata->'meta'->>'data_quality', 'medium') as quality,
              'draft' as status,
              i.created_at,
              i.updated_at
            FROM items i
            WHERE
              ((i.specs->'pros' IS NOT NULL AND jsonb_array_length(i.specs->'pros') > 0)
               OR (i.specs->'cons' IS NOT NULL AND jsonb_array_length(i.specs->'cons') > 0))
              AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.item_id = i.id);`
    }
  ];

  console.log('\n🔧 Applying Migration 026: Unify Review Schema\n');

  // For now, let's use a simpler approach with pg module or supabase REST API
  // Since we don't have direct SQL execution via MCP, let's log the SQL and guide manual execution

  console.log('Migration SQL (copy and paste into Supabase SQL Editor):\n');
  console.log('-- ============================================================================');
  console.log('-- Migration 026: Unify Review Schema');
  console.log('-- ============================================================================\n');

  migrations.forEach((m, i) => {
    console.log(`-- Step ${i + 1}: ${m.name}`);
    console.log(m.sql);
    console.log('');
  });

  console.log(`COMMENT ON COLUMN reviews.context_id IS 'Context for this review. NULL = general/discovery review, non-NULL = context-specific review';`);
  console.log('\nANALYZE reviews;');
  console.log('\n-- ============================================================================');
  console.log('\n📋 Instructions:');
  console.log('1. Copy the SQL above');
  console.log('2. Go to Supabase Dashboard → SQL Editor');
  console.log('3. Paste and run the SQL');
  console.log('4. Verify: SELECT COUNT(*) FROM reviews WHERE context_id IS NULL;');
}

applyMigration();
