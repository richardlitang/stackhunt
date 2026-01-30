#!/usr/bin/env npx tsx
/**
 * QA Improve Script
 *
 * Finds data quality issues and immediately runs hunts to fix them.
 * Unlike qa-check.ts (which only reports/queues), this script actually
 * runs the hunter to refresh and improve the data.
 *
 * Usage:
 *   npm run qa:improve                           # Check all, improve those with issues
 *   npm run qa:improve -- --tool="Salesforce"   # Improve a single tool
 *   npm run qa:improve -- --tools="Slack,Notion" # Improve multiple tools
 *   npm run qa:improve -- --limit=5             # Only improve first 5 with issues
 *   npm run qa:improve -- --type=legacy_pros_cons # Only fix legacy format issues
 *   npm run qa:improve -- --dry-run             # Show what would be improved
 *
 * @module scripts/qa-improve
 */

import { parseArgs } from 'util';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../src/types/database';

// Load environment variables
config();

// Help text (defined early for --help without env vars)
function printHelp(): void {
  console.log(`
StackHunt QA Improve
====================

Find data quality issues and immediately run hunts to fix them.
This script actually improves the data, not just reports issues.

Usage:
  npm run qa:improve                      Improve all tools with issues
  npm run qa:improve -- [options]         Improve with options

Selection Options:
  -t, --tool <name>                       Improve a single tool by name
  --tools <name1,name2>                   Improve multiple tools by name
  --tool-id <uuid>                        Improve a single tool by ID
  --tool-ids <uuid1,uuid2>                Improve multiple tools by ID

Filter Options:
  -s, --stale-days <days>                 Days before data is considered stale (default: 60)
  --severity <level>                      Only fix issues of severity: critical, warning
  --type <type>                           Only fix specific issue type (see below)
  -l, --limit <n>                         Max tools to improve (default: 10)

Output Options:
  -v, --verbose                           Show detailed output
  --dry-run                               Show what would be improved without doing it

Issue Types (fixable by re-hunt):
  missing_logo          Tool has no logo image
  missing_website       Tool has no website URL
  missing_description   Tool has no short description
  missing_embedding     Tool has no embedding vector
  legacy_pros_cons      Review uses legacy string format (no source attribution)
  missing_score         Review has no score
  missing_summary       Review has no or very short summary
  no_pros               Review has no pros listed
  no_cons               Review has no cons listed
  stale_data            Data hasn't been updated recently
  no_reviews            Tool has no reviews at all

Examples:
  npm run qa:improve                               # Improve up to 10 tools with issues
  npm run qa:improve -- --tool="Salesforce"       # Improve single tool
  npm run qa:improve -- --type=legacy_pros_cons   # Only fix legacy format
  npm run qa:improve -- --severity=critical       # Only fix critical issues
  npm run qa:improve -- --limit=20                # Improve up to 20 tools
  npm run qa:improve -- --stale-days=30           # Consider 30+ days as stale
  npm run qa:improve -- --dry-run                 # Preview without changes
`);
}

// Parse args early for --help
const { values: earlyArgs } = parseArgs({
  options: { help: { type: 'boolean', short: 'h' } },
  strict: false,
});

if (earlyArgs.help) {
  printHelp();
  process.exit(0);
}

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!GEMINI_API_KEY || !SERPER_API_KEY) {
  console.error('Missing required for hunting: GEMINI_API_KEY, SERPER_API_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration defaults
const DEFAULT_STALE_DAYS = 60;
const DEFAULT_LIMIT = 10;
const RATE_LIMIT_DELAY_MS = 3000; // Wait between hunts to avoid rate limits

// ============================================================================
// TYPES
// ============================================================================

interface QAIssue {
  toolId: string;
  toolName: string;
  reviewId?: string;
  contextTitle?: string;
  issueType: IssueType;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  canFix: boolean;
}

type IssueType =
  | 'missing_logo'
  | 'missing_website'
  | 'missing_description'
  | 'missing_embedding'
  | 'legacy_pros_cons'
  | 'missing_score'
  | 'low_score'
  | 'missing_summary'
  | 'no_pros'
  | 'no_cons'
  | 'stale_data'
  | 'no_reviews'
  | 'no_affiliate'
  | 'broken_affiliate';

interface ToolWithReviews {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo_url: string | null;
  short_description: string | null;
  embedding: number[] | null;
  updated_at: string;
  reviews: Array<{
    id: string;
    score: number | null;
    summary_markdown: string | null;
    pros: unknown[];
    cons: unknown[];
    updated_at: string;
    context: {
      id: string;
      title: string;
    } | null;
  }>;
}

interface ImproveResult {
  toolName: string;
  success: boolean;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
  issuesFixed: string[];
}

// ============================================================================
// QA CHECKS (copied from qa-check.ts for self-contained script)
// ============================================================================

function isLegacyFormat(claims: unknown[]): boolean {
  if (!claims || claims.length === 0) return false;
  return claims.some((claim) => typeof claim === 'string');
}

function checkTool(tool: ToolWithReviews, staleDays: number): QAIssue[] {
  const issues: QAIssue[] = [];
  const now = new Date();

  // Tool-level checks
  if (!tool.logo_url) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'missing_logo',
      severity: 'warning',
      description: 'Tool has no logo image',
      canFix: true,
    });
  }

  if (!tool.website) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'missing_website',
      severity: 'warning',
      description: 'Tool has no website URL',
      canFix: true,
    });
  }

  if (!tool.short_description) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'missing_description',
      severity: 'warning',
      description: 'Tool has no short description',
      canFix: true,
    });
  }

  if (!tool.embedding || tool.embedding.length === 0) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'missing_embedding',
      severity: 'info',
      description: 'Tool has no embedding vector',
      canFix: true,
    });
  }

  // Check staleness
  const toolUpdated = new Date(tool.updated_at);
  const daysSinceUpdate = Math.floor(
    (now.getTime() - toolUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceUpdate > staleDays) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'stale_data',
      severity: 'warning',
      description: `Data is ${daysSinceUpdate} days old`,
      canFix: true,
    });
  }

  // Check if tool has reviews
  if (tool.reviews.length === 0) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'no_reviews',
      severity: 'critical',
      description: 'Tool has no reviews',
      canFix: true,
    });
  }

  // Review-level checks
  for (const review of tool.reviews) {
    const contextTitle = review.context?.title || 'Unknown context';

    if (isLegacyFormat(review.pros) || isLegacyFormat(review.cons)) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'legacy_pros_cons',
        severity: 'warning',
        description: 'Uses legacy string format (no source attribution)',
        canFix: true,
      });
    }

    if (review.score === null || review.score === undefined) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'missing_score',
        severity: 'critical',
        description: 'Review has no score',
        canFix: true,
      });
    }

    if (!review.summary_markdown || review.summary_markdown.trim().length < 50) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'missing_summary',
        severity: 'critical',
        description: 'Review has no/short summary',
        canFix: true,
      });
    }

    if (!review.pros || review.pros.length === 0) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'no_pros',
        severity: 'warning',
        description: 'Review has no pros',
        canFix: true,
      });
    }

    if (!review.cons || review.cons.length === 0) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'no_cons',
        severity: 'warning',
        description: 'Review has no cons',
        canFix: true,
      });
    }
  }

  return issues;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchTools(
  toolNames?: string[],
  toolIds?: string[]
): Promise<ToolWithReviews[]> {
  let query = supabase
    .from('tools')
    .select(
      `
      id,
      name,
      slug,
      website,
      logo_url,
      short_description,
      embedding,
      updated_at,
      reviews (
        id,
        score,
        summary_markdown,
        pros,
        cons,
        updated_at,
        context:contexts (
          id,
          title
        )
      )
    `
    )
    .order('name');

  if (toolIds && toolIds.length > 0) {
    query = query.in('id', toolIds);
  } else if (toolNames && toolNames.length > 0) {
    query = query.in('name', toolNames);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch tools:', error.message);
    process.exit(1);
  }

  return (data as unknown as ToolWithReviews[]) || [];
}

async function findToolByName(name: string): Promise<ToolWithReviews | null> {
  const { data } = await supabase
    .from('tools')
    .select(
      `
      id,
      name,
      slug,
      website,
      logo_url,
      short_description,
      embedding,
      updated_at,
      reviews (
        id,
        score,
        summary_markdown,
        pros,
        cons,
        updated_at,
        context:contexts (
          id,
          title
        )
      )
    `
    )
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();

  return data as unknown as ToolWithReviews | null;
}

// ============================================================================
// HUNTER INTEGRATION
// ============================================================================

async function runHunt(
  toolName: string,
  contextTitle?: string
): Promise<{ success: boolean; error?: string; tokensUsed?: number; durationMs?: number }> {
  const { Hunter } = await import('../src/lib/hunter');

  const hunter = new Hunter({
    supabaseUrl: SUPABASE_URL!,
    supabaseServiceKey: SUPABASE_SERVICE_KEY!,
    geminiApiKey: GEMINI_API_KEY!,
    serperApiKey: SERPER_API_KEY!,
    isDraftMode: false, // Publish immediately for improvements
  });

  const result = await hunter.hunt({
    toolName,
    contextTitle,
  });

  return {
    success: result.success,
    error: result.error,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { values } = parseArgs({
    options: {
      tool: { type: 'string', short: 't' },
      tools: { type: 'string' },
      'tool-id': { type: 'string' },
      'tool-ids': { type: 'string' },
      'stale-days': { type: 'string', short: 's' },
      severity: { type: 'string' },
      type: { type: 'string' },
      limit: { type: 'string', short: 'l' },
      verbose: { type: 'boolean', short: 'v' },
      'dry-run': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const staleDays = parseInt(values['stale-days'] as string) || DEFAULT_STALE_DAYS;
  const limit = parseInt(values.limit as string) || DEFAULT_LIMIT;
  const verbose = values.verbose || false;
  const dryRun = values['dry-run'] || false;
  const severityFilter = values.severity as string | undefined;
  const typeFilter = values.type as string | undefined;

  console.log('═'.repeat(60));
  console.log('StackHunt QA Improve');
  console.log('═'.repeat(60));
  console.log(`Staleness threshold: ${staleDays} days`);
  console.log(`Max tools to improve: ${limit}`);
  if (severityFilter) console.log(`Severity filter: ${severityFilter}`);
  if (typeFilter) console.log(`Type filter: ${typeFilter}`);
  if (dryRun) console.log('Mode: DRY RUN (no changes will be made)');
  console.log('');

  // Determine which tools to check
  let tools: ToolWithReviews[] = [];

  if (values.tool) {
    const tool = await findToolByName(values.tool as string);
    if (!tool) {
      console.error(`Tool not found: ${values.tool}`);
      process.exit(1);
    }
    tools = [tool];
    console.log(`Checking tool: ${tool.name}`);
  } else if (values.tools) {
    const names = (values.tools as string).split(',').map((n) => n.trim());
    tools = await fetchTools(names, undefined);
    console.log(`Checking ${tools.length} tools`);
  } else if (values['tool-id']) {
    tools = await fetchTools(undefined, [values['tool-id'] as string]);
    if (tools.length === 0) {
      console.error(`Tool not found with ID: ${values['tool-id']}`);
      process.exit(1);
    }
    console.log(`Checking tool: ${tools[0].name}`);
  } else if (values['tool-ids']) {
    const ids = (values['tool-ids'] as string).split(',').map((id) => id.trim());
    tools = await fetchTools(undefined, ids);
    console.log(`Checking ${tools.length} tools`);
  } else {
    tools = await fetchTools();
    console.log(`Checking all ${tools.length} tools`);
  }

  // Run QA checks and collect tools with fixable issues
  const toolsToImprove = new Map<
    string,
    { tool: ToolWithReviews; issues: QAIssue[]; contexts: string[] }
  >();

  for (const tool of tools) {
    let issues = checkTool(tool, staleDays);

    // Filter to only fixable issues
    issues = issues.filter((i) => i.canFix);

    // Apply filters
    if (severityFilter) {
      issues = issues.filter((i) => i.severity === severityFilter);
    }
    if (typeFilter) {
      issues = issues.filter((i) => i.issueType === typeFilter);
    }

    if (issues.length > 0) {
      // Collect unique contexts that need improvement
      const contexts = new Set<string>();
      for (const issue of issues) {
        if (issue.contextTitle) {
          contexts.add(issue.contextTitle);
        }
      }

      toolsToImprove.set(tool.id, {
        tool,
        issues,
        contexts: Array.from(contexts),
      });
    }
  }

  console.log(`\nFound ${toolsToImprove.size} tools with fixable issues`);

  if (toolsToImprove.size === 0) {
    console.log('\nNo tools need improvement!');
    process.exit(0);
  }

  // Display what will be improved
  console.log('\n' + '-'.repeat(60));
  console.log('Tools to improve:');
  console.log('-'.repeat(60));

  let count = 0;
  const toolsToProcess: Array<{ tool: ToolWithReviews; issues: QAIssue[]; contexts: string[] }> =
    [];

  for (const [_, data] of toolsToImprove) {
    if (count >= limit) break;

    console.log(`\n${data.tool.name}`);
    for (const issue of data.issues) {
      const icon = issue.severity === 'critical' ? '!!!' : issue.severity === 'warning' ? '!' : '-';
      console.log(`  [${icon}] ${issue.issueType}: ${issue.description}`);
    }

    toolsToProcess.push(data);
    count++;
  }

  if (toolsToImprove.size > limit) {
    console.log(`\n... and ${toolsToImprove.size - limit} more tools (use --limit to increase)`);
  }

  if (dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('[DRY RUN] No changes were made');
    console.log('═'.repeat(60));
    process.exit(0);
  }

  // Run improvements
  console.log('\n' + '═'.repeat(60));
  console.log('Running improvements...');
  console.log('═'.repeat(60));

  const results: ImproveResult[] = [];
  let totalTokens = 0;

  for (let i = 0; i < toolsToProcess.length; i++) {
    const { tool, issues, contexts } = toolsToProcess[i];

    console.log(`\n[${i + 1}/${toolsToProcess.length}] Improving: ${tool.name}`);

    try {
      // Run hunt for the tool (optionally with context)
      const contextTitle = contexts.length > 0 ? contexts[0] : undefined;

      if (verbose) {
        console.log(`  Running hunt${contextTitle ? ` for context: ${contextTitle}` : ''}...`);
      }

      const huntResult = await runHunt(tool.name, contextTitle);

      if (huntResult.success) {
        console.log(`  OK - ${((huntResult.durationMs || 0) / 1000).toFixed(1)}s, ${huntResult.tokensUsed || 0} tokens`);
        totalTokens += huntResult.tokensUsed || 0;

        results.push({
          toolName: tool.name,
          success: true,
          tokensUsed: huntResult.tokensUsed,
          durationMs: huntResult.durationMs,
          issuesFixed: issues.map((i) => i.issueType),
        });
      } else {
        console.log(`  FAILED: ${huntResult.error}`);
        results.push({
          toolName: tool.name,
          success: false,
          error: huntResult.error,
          issuesFixed: [],
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ERROR: ${errorMsg}`);
      results.push({
        toolName: tool.name,
        success: false,
        error: errorMsg,
        issuesFixed: [],
      });
    }

    // Rate limit between hunts
    if (i < toolsToProcess.length - 1) {
      if (verbose) console.log(`  Waiting ${RATE_LIMIT_DELAY_MS / 1000}s before next hunt...`);
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('\n' + '═'.repeat(60));
  console.log('Improvement Summary');
  console.log('═'.repeat(60));
  console.log(`Tools processed:  ${results.length}`);
  console.log(`Successful:       ${successful}`);
  console.log(`Failed:           ${failed}`);
  console.log(`Total tokens:     ${totalTokens}`);

  if (failed > 0) {
    console.log('\nFailed tools:');
    for (const r of results.filter((r) => !r.success)) {
      console.log(`  - ${r.toolName}: ${r.error}`);
    }
  }

  console.log('═'.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
