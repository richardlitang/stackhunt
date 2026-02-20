#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { diffWinner } from '../src/lib/compiler/diff-report.js';

dotenv.config();

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function parseLimit(): number {
  const raw = Number(getArgValue('sample') || 50);
  if (!Number.isFinite(raw)) return 50;
  return Math.max(1, Math.min(raw, 500));
}

function parseSnapshotStatus(): 'draft' | 'published' {
  const raw = (getArgValue('status') || 'draft').toLowerCase();
  return raw === 'published' ? 'published' : 'draft';
}

function runtimeWinnerFromScores(scoreA: number, scoreB: number): string {
  const delta = Number((scoreA - scoreB).toFixed(1));
  if (Math.abs(delta) < 1.5) return 'depends';
  return delta > 0 ? 'a' : 'b';
}

function snapshotWinnerToAB(snapshotWinner: string | null, toolASlug: string, toolBSlug: string): string | null {
  if (!snapshotWinner) return null;
  if (snapshotWinner === 'depends' || snapshotWinner === 'tie') return 'depends';
  if (snapshotWinner === toolASlug) return 'a';
  if (snapshotWinner === toolBSlug) return 'b';
  return snapshotWinner;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sample = parseLimit();
  const snapshotStatus = parseSnapshotStatus();
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: compareRows, error: compareError } = await supabase
    .from('compare_snapshots')
    .select('tool_a_slug, tool_b_slug, snapshot_json, computed_at')
    .eq('status', snapshotStatus)
    .order('computed_at', { ascending: false })
    .limit(sample);

  if (compareError) {
    console.error(`Failed to load compare snapshots: ${compareError.message}`);
    process.exit(1);
  }

  const rows = (compareRows || []) as Array<{
    tool_a_slug: string;
    tool_b_slug: string;
    snapshot_json: any;
  }>;

  if (rows.length === 0) {
    console.log('No compare snapshots available for diff run.');
    return;
  }

  let compared = 0;
  let matches = 0;

  for (const row of rows) {
    const { data: tools, error: toolsError } = await supabase
      .from('items')
      .select('slug, avg_score')
      .in('slug', [row.tool_a_slug, row.tool_b_slug])
      .limit(2);

    if (toolsError || !tools || tools.length !== 2) continue;

    const toolA = tools.find((tool: any) => tool.slug === row.tool_a_slug) as any;
    const toolB = tools.find((tool: any) => tool.slug === row.tool_b_slug) as any;
    if (!toolA || !toolB) continue;

    const runtimeWinner = runtimeWinnerFromScores(Number(toolA.avg_score || 0), Number(toolB.avg_score || 0));
    const snapshotWinnerRaw =
      typeof row.snapshot_json?.verdict?.winner === 'string' ? row.snapshot_json.verdict.winner : null;
    const snapshotWinner = snapshotWinnerToAB(snapshotWinnerRaw, row.tool_a_slug, row.tool_b_slug);

    const diff = diffWinner(runtimeWinner, snapshotWinner);
    compared += 1;
    if (diff.matches) matches += 1;
  }

  console.log('\nCompare Runtime vs Snapshot Diff');
  console.log(`Snapshot status: ${snapshotStatus}`);
  console.log(`Pairs sampled: ${rows.length}`);
  console.log(`Pairs compared: ${compared}`);
  console.log(`Winner matches: ${matches}`);
  console.log(`Winner agreement rate: ${compared > 0 ? ((matches / compared) * 100).toFixed(1) : '0.0'}%`);
}

main().catch((error) => {
  console.error('Unexpected compare diff failure:', error);
  process.exit(1);
});
