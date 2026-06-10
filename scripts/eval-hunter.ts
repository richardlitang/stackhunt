#!/usr/bin/env npx tsx
/**
 * Replay the analysis phase against frozen research fixtures and score output.
 * Usage: npm run eval:hunter [-- --only <slug>]
 * Costs: one Gemini synthesis call per fixture. Keep fixtures <= 10.
 */

import 'dotenv/config';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { executeAnalysisPhase } from '../src/lib/hunter/phases/analysis';
import { detectCoverageGaps } from '../src/lib/hunter/coverage/coverage-gaps';
import { type EvalGolden, scoreAnalysisAgainstGolden } from '../src/lib/hunter/evals/scoring';
import { GeminiService } from '../src/lib/hunter/services/gemini';
import type { HunterContext, HunterDependencies, ResearchOutput } from '../src/lib/hunter/types';
import type { Database } from '../src/types/database';

process.env.HUNTER_GEMINI_SYNTHESIS_THINKING_LEVEL ||= 'LOW';
process.env.HUNTER_GEMINI_SYNTHESIS_TIMEOUT_FALLBACK_THINKING_LEVEL ||= 'LOW';

interface EvalFixture {
  capturedAt: string;
  queueItemId: string;
  toolName: string;
  contextTitle?: string | null;
  categorySlug?: string | null;
  research: ResearchOutput;
}

interface EvalResult {
  slug: string;
  failures: string[];
  metrics: ReturnType<typeof scoreAnalysisAgainstGolden>['metrics'];
}

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

async function evalFixture(slug: string): Promise<EvalResult> {
  const fixture = readJsonFile<EvalFixture>(resolve('evals/fixtures', `${slug}.json`));
  const golden = readJsonFile<EvalGolden>(resolve('evals/golden', `${slug}.json`));

  const ctx: HunterContext = {
    toolName: fixture.toolName,
    contextTitle: fixture.contextTitle || undefined,
    categorySlug: fixture.categorySlug || undefined,
    queueItemId: fixture.queueItemId,
    huntType: 'full',
    skipPersistence: true,
    startTime: Date.now(),
    tokensUsed: 0,
    logs: [],
    research: fixture.research,
  };

  const buildDeps = (): HunterDependencies => ({
    supabase,
    serper: null,
    gemini: new GeminiService({ apiKey: process.env.GEMINI_API_KEY! }),
    inventory: {
      fetchModelInventory: async () => ({
        provider: null,
        modelOptions: [],
        snippets: [],
        sourceUrls: [],
      }),
    },
    logo: {
      fetchAndUpload: async () => null,
    },
    config: {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      geminiApiKey: process.env.GEMINI_API_KEY!,
      serperApiKey: process.env.SERPER_API_KEY || '',
      inventoryApiKeys: {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
      },
      isDraftMode: true,
    },
    withRetry: async <T>(fn: () => Promise<T>) => fn(),
    log: (message: string) => console.log(`[eval:${slug}] ${message}`),
  });

  const executeWithModel = async (
    model: string
  ): Promise<Awaited<ReturnType<typeof executeAnalysisPhase>>> => {
    process.env.HUNTER_GEMINI_MODEL_ANALYSIS_SYNTHESIS = model;
    process.env.HUNTER_GEMINI_SYNTHESIS_TIMEOUT_FALLBACK_MODEL = 'gemini-2.5-flash';
    return executeAnalysisPhase(ctx, buildDeps());
  };

  let output: Awaited<ReturnType<typeof executeAnalysisPhase>>;
  try {
    output = await executeWithModel('gemini-2.5-flash');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/schema validation failed/i.test(message)) {
      throw error;
    }
    console.log(`[eval:${slug}] Fast-model schema miss, retrying with quality synthesis model`);
    output = await executeWithModel('gemini-3-flash-preview');
  }
  const coverageGaps = detectCoverageGaps(
    output.analysis,
    fixture.research.knowledgeCard,
    (output.generationQuality as Record<string, unknown> | undefined) || undefined
  );
  const scored = scoreAnalysisAgainstGolden({
    analysis: output.analysis,
    golden,
    quality: output.generationQuality || {},
    coverageGaps,
  });

  return {
    slug,
    failures: scored.failures,
    metrics: scored.metrics,
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      only: { type: 'string' },
    },
  });

  const slugs = readdirSync(resolve('evals/fixtures'))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .filter((slug) => existsSync(resolve('evals/golden', `${slug}.json`)))
    .filter((slug) => (values.only ? slug === values.only : true));

  const results: EvalResult[] = [];
  for (const slug of slugs) {
    results.push(await evalFixture(slug));
  }

  mkdirSync(resolve('evals/reports'), { recursive: true });
  const report = { ranAt: new Date().toISOString(), results };
  writeFileSync(
    resolve('evals/reports', `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`),
    JSON.stringify(report, null, 2)
  );

  let failed = 0;
  for (const result of results) {
    const status = result.failures.length === 0 ? 'PASS' : 'FAIL';
    if (status === 'FAIL') {
      failed += 1;
    }
    console.log(`${status}  ${result.slug}  ${JSON.stringify(result.metrics)}`);
    for (const failure of result.failures) {
      console.log(`      - ${failure}`);
    }
  }

  console.log(`\n${results.length - failed}/${results.length} fixtures passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
