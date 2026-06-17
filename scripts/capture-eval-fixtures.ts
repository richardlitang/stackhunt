#!/usr/bin/env npx tsx
/**
 * Capture eval fixtures from hunt_queue research checkpoints.
 * Usage: npm run eval:capture -- --limit 8 [--tool "Notion"]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { buildEvalFixtureSlug, extractResearchCheckpoint } from '../src/lib/hunter/evals/fixtures';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string', default: '8' },
      tool: { type: 'string' },
    },
  });

  const limit = Math.min(Math.max(Number(values.limit || '8'), 1), 25);
  let query = supabase
    .from('hunt_queue')
    .select('id, tool_name, context_title, category_slug, phase_checkpoint, updated_at')
    .not('phase_checkpoint', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (values.tool) {
    query = query.eq('tool_name', values.tool);
  }

  const { data, error } = await query;
  if (error) throw new Error(`hunt_queue query failed: ${error.message}`);

  const outDir = resolve(import.meta.dirname, '../evals/fixtures');
  mkdirSync(outDir, { recursive: true });

  let written = 0;
  for (const row of data || []) {
    const research = extractResearchCheckpoint(
      row.phase_checkpoint as Record<string, unknown> | null
    );
    if (!research) continue;

    const slug = buildEvalFixtureSlug(row.tool_name, row.context_title);
    const fixture = {
      capturedAt: new Date().toISOString(),
      queueItemId: row.id,
      toolName: row.tool_name,
      contextTitle: row.context_title,
      categorySlug: row.category_slug,
      research,
    };

    writeFileSync(resolve(outDir, `${slug}.json`), JSON.stringify(fixture, null, 2));
    console.log(`captured ${slug}.json`);
    written += 1;
  }

  console.log(`${written} fixture(s) written to evals/fixtures/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
