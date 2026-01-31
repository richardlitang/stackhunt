#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('📦 Applying Flywheel Architecture migration...\n');

  const migrations = [
    {
      name: 'Add queued_tool_ids to contexts',
      sql: `ALTER TABLE contexts
ADD COLUMN IF NOT EXISTS queued_tool_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS discovery_query TEXT,
ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ;`,
    },
    {
      name: 'Add context tracking to hunt_queue',
      sql: `ALTER TABLE hunt_queue
ADD COLUMN IF NOT EXISTS context_id UUID REFERENCES contexts(id),
ADD COLUMN IF NOT EXISTS is_discovery_hunt BOOLEAN DEFAULT false;`,
    },
    {
      name: 'Create cleanup function',
      sql: `CREATE OR REPLACE FUNCTION remove_from_queued_tools()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.context_id IS NOT NULL AND NEW.is_discovery_hunt = true THEN
    UPDATE contexts
    SET queued_tool_ids = array_remove(queued_tool_ids, NEW.tool_id)
    WHERE id = NEW.context_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`,
    },
    {
      name: 'Create cleanup trigger',
      sql: `DROP TRIGGER IF EXISTS cleanup_queued_tools ON hunt_queue;
CREATE TRIGGER cleanup_queued_tools
AFTER UPDATE OF status ON hunt_queue
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION remove_from_queued_tools();`,
    },
    {
      name: 'Create indexes',
      sql: `CREATE INDEX IF NOT EXISTS idx_contexts_queued_tools ON contexts USING GIN (queued_tool_ids);
CREATE INDEX IF NOT EXISTS idx_hunt_queue_context ON hunt_queue(context_id) WHERE context_id IS NOT NULL;`,
    },
  ];

  for (const migration of migrations) {
    console.log(`Applying: ${migration.name}...`);
    try {
      const { error } = await (supabase as any).rpc('exec', { sql: migration.sql });
      if (error) {
        console.log(`⚠️  ${migration.name}: ${error.message}`);
      } else {
        console.log(`✅ ${migration.name} applied`);
      }
    } catch (err: any) {
      console.log(`⚠️  ${migration.name}: ${err.message}`);
    }
  }

  console.log('\n✅ Migration complete!');
}

applyMigration().catch((error) => {
  console.error('❌ Failed:', error.message);
  process.exit(1);
});
