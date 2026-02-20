import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/types/database.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const startedAt = Date.now();

  const { data, error } = await supabase.rpc('recompute_context_count_semantics', {
    p_context_id: null,
  });

  if (error) {
    console.error('[Backfill] Failed:', error.message);
    process.exit(1);
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[Backfill] Updated context count semantics for ${String(data ?? 0)} contexts in ${durationMs}ms`
  );
}

main().catch((error) => {
  console.error('[Backfill] Unexpected error:', error);
  process.exit(1);
});

