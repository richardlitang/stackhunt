#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { execSync } from 'child_process';

config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.DATABASE_URL;

console.log('📦 Applying Flywheel Architecture migration...\n');

// Method 1: Try using psql if DATABASE_URL is available
if (DB_URL) {
  console.log('Using direct database connection...\n');

  const sql = `
-- Add queued_tool_ids to contexts
ALTER TABLE contexts
ADD COLUMN IF NOT EXISTS queued_tool_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS discovery_query TEXT,
ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ;

-- Add context tracking to hunt_queue
ALTER TABLE hunt_queue
ADD COLUMN IF NOT EXISTS context_id UUID REFERENCES contexts(id),
ADD COLUMN IF NOT EXISTS is_discovery_hunt BOOLEAN DEFAULT false;

-- Create cleanup function
CREATE OR REPLACE FUNCTION remove_from_queued_tools()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.context_id IS NOT NULL AND NEW.is_discovery_hunt = true THEN
    UPDATE contexts
    SET queued_tool_ids = array_remove(queued_tool_ids, NEW.tool_id)
    WHERE id = NEW.context_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup trigger
DROP TRIGGER IF EXISTS cleanup_queued_tools ON hunt_queue;
CREATE TRIGGER cleanup_queued_tools
AFTER UPDATE OF status ON hunt_queue
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION remove_from_queued_tools();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contexts_queued_tools ON contexts USING GIN (queued_tool_ids);
CREATE INDEX IF NOT EXISTS idx_hunt_queue_context ON hunt_queue(context_id) WHERE context_id IS NOT NULL;
  `;

  try {
    execSync(`psql "${DB_URL}" -c "${sql.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    });
    console.log('\n✅ Migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Direct DB execution failed, trying alternate method...\n');
  }
}

// Method 2: Instructions for manual application
console.log('⚠️  Automatic migration failed.');
console.log('\n📋 Please apply this migration manually via Supabase Dashboard:\n');
console.log('1. Go to: https://supabase.com/dashboard/project/vhelpqzbtzwiddoebnyy/sql/new');
console.log('2. Copy and paste the following SQL:\n');
console.log('─'.repeat(60));
console.log(`
-- Add queued_tool_ids to contexts
ALTER TABLE contexts
ADD COLUMN IF NOT EXISTS queued_tool_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS discovery_query TEXT,
ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ;

-- Add context tracking to hunt_queue
ALTER TABLE hunt_queue
ADD COLUMN IF NOT EXISTS context_id UUID REFERENCES contexts(id),
ADD COLUMN IF NOT EXISTS is_discovery_hunt BOOLEAN DEFAULT false;

-- Create cleanup function
CREATE OR REPLACE FUNCTION remove_from_queued_tools()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.context_id IS NOT NULL AND NEW.is_discovery_hunt = true THEN
    UPDATE contexts
    SET queued_tool_ids = array_remove(queued_tool_ids, NEW.tool_id)
    WHERE id = NEW.context_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup trigger
DROP TRIGGER IF EXISTS cleanup_queued_tools ON hunt_queue;
CREATE TRIGGER cleanup_queued_tools
AFTER UPDATE OF status ON hunt_queue
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION remove_from_queued_tools();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contexts_queued_tools ON contexts USING GIN (queued_tool_ids);
CREATE INDEX IF NOT EXISTS idx_hunt_queue_context ON hunt_queue(context_id) WHERE context_id IS NOT NULL;
`);
console.log('─'.repeat(60));
console.log('\n3. Click "Run" to execute');
console.log('\n✅ Once applied, re-run the content ideas script to test Flywheel with cross-pollination');
