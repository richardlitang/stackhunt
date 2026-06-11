#!/usr/bin/env npx tsx
/**
 * Hunt cost report: last N days of hunt_telemetry.
 * Usage: npm run qa:hunt-costs [-- --days 7]
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  buildHuntCostReport,
  formatHuntCostReport,
  type HuntCostRow,
} from '../src/lib/hunter/hunt-cost-report';

function getDaysArg(args: string[]): number {
  const daysIndex = args.indexOf('--days');
  const rawValue = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 7;
  if (!Number.isFinite(rawValue)) return 7;
  return Math.max(1, Math.min(Math.round(rawValue), 365));
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  const days = getDaysArg(process.argv.slice(2));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('hunt_telemetry')
    .select('tool_name, success, duration_ms, tokens_total, estimated_cost_usd, error_class')
    .gte('created_at', since)
    .limit(2000);

  if (error) {
    throw new Error(
      `${error.message}. If hunt_telemetry is missing, apply supabase/migrations/20260610120000_add_hunt_telemetry.sql first.`
    );
  }

  const report = buildHuntCostReport((data || []) as HuntCostRow[], days);
  console.log(formatHuntCostReport(report));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
