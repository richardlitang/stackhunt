import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.rpc('reconcile_review_vote_counts');
  if (error) {
    console.error('Failed to reconcile vote counts:', error.message);
    process.exit(1);
  }

  console.log(`Reconciled review vote counters. Updated rows: ${data ?? 0}`);
}

main().catch((error) => {
  console.error('Unexpected error during vote reconciliation:', error);
  process.exit(1);
});
