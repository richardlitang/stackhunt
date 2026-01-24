#!/usr/bin/env npx tsx
/**
 * QA Check Script
 *
 * Checks data quality across tools, reviews, and affiliate offers.
 * Can queue items for re-hunting to improve or update stale data.
 *
 * Usage:
 *   npm run qa                                    # Check all data, report only
 *   npm run qa -- --tool="Salesforce"            # Check a single tool
 *   npm run qa -- --tools="Slack,Notion"         # Check multiple tools
 *   npm run qa -- --tool-id="uuid"               # Check by tool ID
 *   npm run qa -- --queue                         # Queue failing items for re-hunt
 *   npm run qa -- --queue --priority=80          # Queue with high priority
 *   npm run qa -- --stale-days=90                # Custom staleness threshold
 *   npm run qa -- --fix                          # Auto-fix minor issues where possible
 *
 * @module scripts/qa-check
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
StackHunt QA Check
==================

Check data quality across tools, reviews, and affiliate offers.
Optionally queue items with issues for re-hunting.

Usage:
  npm run qa                          Check all tools
  npm run qa -- [options]             Check with options

Selection Options:
  -t, --tool <name>                   Check a single tool by name
  --tools <name1,name2>               Check multiple tools by name (comma-separated)
  --tool-id <uuid>                    Check a single tool by ID
  --tool-ids <uuid1,uuid2>            Check multiple tools by ID (comma-separated)

QA Options:
  -s, --stale-days <days>             Days before data is considered stale (default: 60)
  --severity <level>                  Filter by severity: critical, warning, info
  --type <type>                       Filter by issue type (see below)
  --issues-only                       Only show tools with issues

Output Options:
  -v, --verbose                       Show detailed issue information

Queue Options:
  -q, --queue                         Queue failing tools for re-hunt
  -p, --priority <0-100>              Priority for queued items (default: 50)
  --dry-run                           Show what would be queued without actually queuing

Issue Types:
  missing_logo          Tool has no logo image
  missing_website       Tool has no website URL
  missing_description   Tool has no short description
  missing_embedding     Tool has no embedding vector
  legacy_pros_cons      Review uses legacy string format (no source attribution)
  missing_score         Review has no score
  low_score             Review has unusually low score (<20)
  missing_summary       Review has no or very short summary
  no_pros               Review has no pros listed
  no_cons               Review has no cons listed
  stale_data            Data hasn't been updated recently
  no_reviews            Tool has no reviews at all
  no_affiliate          Tool has no affiliate offers
  broken_affiliate      Tool has broken affiliate links

Examples:
  npm run qa                                    # Full report of all tools
  npm run qa -- --tool="Salesforce"            # Check single tool
  npm run qa -- --severity=critical            # Only critical issues
  npm run qa -- --type=legacy_pros_cons        # Only legacy format issues
  npm run qa -- --queue --priority=80          # Queue issues with high priority
  npm run qa -- --stale-days=30 --queue        # Queue stale tools (30+ days)
  npm run qa -- --issues-only                  # Only show tools with problems
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration defaults
const DEFAULT_STALE_DAYS = 60;
const DEFAULT_PRIORITY = 50;

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
  canQueue: boolean; // Whether re-hunting would fix this
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
  affiliate_offers: Array<{
    id: string;
    url: string;
    verification_status: string | null;
    is_active: boolean;
  }>;
}

interface QASummary {
  totalTools: number;
  toolsChecked: number;
  issuesFound: number;
  issuesBySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  issuesByType: Record<IssueType, number>;
  toolsWithIssues: number;
  toolsNeedingReHunt: number;
}

// ============================================================================
// QA CHECKS
// ============================================================================

/**
 * Check if pros/cons are in legacy string format vs ClaimWithSource
 */
function isLegacyFormat(claims: unknown[]): boolean {
  if (!claims || claims.length === 0) return false;
  // Legacy format is just strings, new format is objects with source_url
  return claims.some((claim) => typeof claim === 'string');
}

/**
 * Run all QA checks on a single tool
 */
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
      canQueue: true,
    });
  }

  if (!tool.website) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'missing_website',
      severity: 'warning',
      description: 'Tool has no website URL',
      canQueue: true,
    });
  }

  if (!tool.short_description) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'missing_description',
      severity: 'warning',
      description: 'Tool has no short description',
      canQueue: true,
    });
  }

  if (!tool.embedding || tool.embedding.length === 0) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'missing_embedding',
      severity: 'info',
      description: 'Tool has no embedding vector (affects search)',
      canQueue: true,
    });
  }

  // Check staleness at tool level
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
      description: `Tool data is ${daysSinceUpdate} days old (threshold: ${staleDays})`,
      canQueue: true,
    });
  }

  // Check if tool has any reviews
  if (tool.reviews.length === 0) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'no_reviews',
      severity: 'critical',
      description: 'Tool has no reviews at all',
      canQueue: true,
    });
  }

  // Check affiliate offers
  if (tool.affiliate_offers.length === 0) {
    issues.push({
      toolId: tool.id,
      toolName: tool.name,
      issueType: 'no_affiliate',
      severity: 'info',
      description: 'Tool has no affiliate offers',
      canQueue: false, // Re-hunting won't add affiliate links
    });
  } else {
    const brokenOffers = tool.affiliate_offers.filter(
      (o) => o.is_active && o.verification_status === 'broken'
    );
    if (brokenOffers.length > 0) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        issueType: 'broken_affiliate',
        severity: 'critical',
        description: `${brokenOffers.length} broken affiliate link(s)`,
        canQueue: false, // Needs manual fix
      });
    }
  }

  // Review-level checks
  for (const review of tool.reviews) {
    const contextTitle = review.context?.title || 'Unknown context';

    // Check for legacy pros/cons format
    if (isLegacyFormat(review.pros) || isLegacyFormat(review.cons)) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'legacy_pros_cons',
        severity: 'warning',
        description: 'Review uses legacy string format for pros/cons (no source attribution)',
        canQueue: true,
      });
    }

    // Check score
    if (review.score === null || review.score === undefined) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'missing_score',
        severity: 'critical',
        description: 'Review has no score',
        canQueue: true,
      });
    } else if (review.score < 20) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'low_score',
        severity: 'info',
        description: `Review has unusually low score (${review.score})`,
        canQueue: false, // Low score might be accurate
      });
    }

    // Check summary
    if (!review.summary_markdown || review.summary_markdown.trim().length < 50) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'missing_summary',
        severity: 'critical',
        description: 'Review has no or very short summary',
        canQueue: true,
      });
    }

    // Check pros/cons existence
    if (!review.pros || review.pros.length === 0) {
      issues.push({
        toolId: tool.id,
        toolName: tool.name,
        reviewId: review.id,
        contextTitle,
        issueType: 'no_pros',
        severity: 'warning',
        description: 'Review has no pros listed',
        canQueue: true,
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
        description: 'Review has no cons listed',
        canQueue: true,
      });
    }
  }

  return issues;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch tools with their reviews and affiliate offers
 */
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
      ),
      affiliate_offers (
        id,
        url,
        verification_status,
        is_active
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

/**
 * Fetch tool by name (case-insensitive fuzzy match)
 */
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
      ),
      affiliate_offers (
        id,
        url,
        verification_status,
        is_active
      )
    `
    )
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();

  return data as unknown as ToolWithReviews | null;
}

// ============================================================================
// QUEUE FUNCTIONS
// ============================================================================

/**
 * Queue tools for re-hunting
 */
async function queueForReHunt(
  tools: Array<{ id: string; name: string; contextTitle?: string }>,
  priority: number,
  dryRun: boolean
): Promise<number> {
  if (dryRun) {
    console.log('\n[DRY RUN] Would queue the following for re-hunt:');
    tools.forEach((t) => {
      console.log(`  - ${t.name}${t.contextTitle ? ` (${t.contextTitle})` : ''}`);
    });
    return tools.length;
  }

  let queued = 0;

  for (const tool of tools) {
    const { error } = await supabase.from('hunt_queue').insert({
      tool_name: tool.name,
      context_title: tool.contextTitle || null,
      priority,
      source: 'qa_check',
      hunt_type: 'refresh',
    });

    if (error) {
      if (error.code === '23505') {
        // Already in queue
        console.log(`  Skipped (already in queue): ${tool.name}`);
      } else {
        console.error(`  Failed to queue ${tool.name}: ${error.message}`);
      }
    } else {
      queued++;
      console.log(`  Queued: ${tool.name} (priority ${priority})`);
    }
  }

  return queued;
}

// ============================================================================
// OUTPUT / REPORTING
// ============================================================================

function printIssue(issue: QAIssue, verbose: boolean): void {
  const icon =
    issue.severity === 'critical' ? '!!!' : issue.severity === 'warning' ? '!' : '-';
  const color =
    issue.severity === 'critical' ? '\x1b[31m' : issue.severity === 'warning' ? '\x1b[33m' : '\x1b[36m';
  const reset = '\x1b[0m';

  if (verbose) {
    console.log(
      `${color}[${icon}]${reset} ${issue.toolName}${issue.contextTitle ? ` / ${issue.contextTitle}` : ''}`
    );
    console.log(`    Type: ${issue.issueType}`);
    console.log(`    ${issue.description}`);
    if (issue.canQueue) console.log(`    Can fix with re-hunt: Yes`);
  } else {
    console.log(
      `${color}[${icon}]${reset} ${issue.toolName}: ${issue.description}${issue.canQueue ? ' *' : ''}`
    );
  }
}

function printSummary(summary: QASummary): void {
  console.log('\n' + '═'.repeat(60));
  console.log('QA Summary');
  console.log('═'.repeat(60));
  console.log(`Tools checked:        ${summary.toolsChecked} / ${summary.totalTools}`);
  console.log(`Tools with issues:    ${summary.toolsWithIssues}`);
  console.log(`Total issues found:   ${summary.issuesFound}`);
  console.log(`Tools needing re-hunt: ${summary.toolsNeedingReHunt}`);

  console.log('\nBy Severity:');
  console.log(`  Critical: ${summary.issuesBySeverity.critical}`);
  console.log(`  Warning:  ${summary.issuesBySeverity.warning}`);
  console.log(`  Info:     ${summary.issuesBySeverity.info}`);

  console.log('\nBy Issue Type:');
  const sortedTypes = Object.entries(summary.issuesByType)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [type, count] of sortedTypes) {
    console.log(`  ${type.padEnd(20)} ${count}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('* = Can be fixed by re-hunting');
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
      queue: { type: 'boolean', short: 'q' },
      priority: { type: 'string', short: 'p' },
      'stale-days': { type: 'string', short: 's' },
      verbose: { type: 'boolean', short: 'v' },
      'dry-run': { type: 'boolean' },
      'issues-only': { type: 'boolean' }, // Only show tools with issues
      severity: { type: 'string' }, // Filter by severity: critical, warning, info
      type: { type: 'string' }, // Filter by issue type
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const staleDays = parseInt(values['stale-days'] as string) || DEFAULT_STALE_DAYS;
  const priority = parseInt(values.priority as string) || DEFAULT_PRIORITY;
  const verbose = values.verbose || false;
  const dryRun = values['dry-run'] || false;
  const issuesOnly = values['issues-only'] || false;
  const severityFilter = values.severity as string | undefined;
  const typeFilter = values.type as string | undefined;

  console.log('═'.repeat(60));
  console.log('StackHunt QA Check');
  console.log('═'.repeat(60));
  console.log(`Staleness threshold: ${staleDays} days`);
  if (values.queue) console.log(`Queue mode: ON (priority ${priority})`);
  if (dryRun) console.log('Dry run: ON');
  console.log('');

  // Determine which tools to check
  let tools: ToolWithReviews[] = [];

  if (values.tool) {
    // Single tool by name
    const tool = await findToolByName(values.tool as string);
    if (!tool) {
      console.error(`Tool not found: ${values.tool}`);
      process.exit(1);
    }
    tools = [tool];
    console.log(`Checking single tool: ${tool.name}`);
  } else if (values.tools) {
    // Multiple tools by name
    const names = (values.tools as string).split(',').map((n) => n.trim());
    tools = await fetchTools(names, undefined);
    console.log(`Checking ${tools.length} tools by name`);
  } else if (values['tool-id']) {
    // Single tool by ID
    tools = await fetchTools(undefined, [values['tool-id'] as string]);
    if (tools.length === 0) {
      console.error(`Tool not found with ID: ${values['tool-id']}`);
      process.exit(1);
    }
    console.log(`Checking single tool: ${tools[0].name}`);
  } else if (values['tool-ids']) {
    // Multiple tools by ID
    const ids = (values['tool-ids'] as string).split(',').map((id) => id.trim());
    tools = await fetchTools(undefined, ids);
    console.log(`Checking ${tools.length} tools by ID`);
  } else {
    // All tools
    tools = await fetchTools();
    console.log(`Checking all ${tools.length} tools`);
  }

  // Get total tool count for summary
  const { count: totalCount } = await supabase
    .from('tools')
    .select('*', { count: 'exact', head: true });

  // Run QA checks
  const allIssues: QAIssue[] = [];
  const toolsWithIssues = new Set<string>();

  for (const tool of tools) {
    const issues = checkTool(tool, staleDays);

    // Apply filters
    let filteredIssues = issues;

    if (severityFilter) {
      filteredIssues = filteredIssues.filter((i) => i.severity === severityFilter);
    }

    if (typeFilter) {
      filteredIssues = filteredIssues.filter((i) => i.issueType === typeFilter);
    }

    if (filteredIssues.length > 0) {
      toolsWithIssues.add(tool.id);
      allIssues.push(...filteredIssues);

      if (!issuesOnly || filteredIssues.length > 0) {
        console.log(`\n${tool.name} (${tool.slug})`);
        console.log('-'.repeat(40));
        for (const issue of filteredIssues) {
          printIssue(issue, verbose);
        }
      }
    } else if (!issuesOnly) {
      console.log(`\n${tool.name} - OK`);
    }
  }

  // Calculate summary
  const summary: QASummary = {
    totalTools: totalCount || tools.length,
    toolsChecked: tools.length,
    issuesFound: allIssues.length,
    issuesBySeverity: {
      critical: allIssues.filter((i) => i.severity === 'critical').length,
      warning: allIssues.filter((i) => i.severity === 'warning').length,
      info: allIssues.filter((i) => i.severity === 'info').length,
    },
    issuesByType: {} as Record<IssueType, number>,
    toolsWithIssues: toolsWithIssues.size,
    toolsNeedingReHunt: new Set(allIssues.filter((i) => i.canQueue).map((i) => i.toolId))
      .size,
  };

  // Count by type
  for (const issue of allIssues) {
    summary.issuesByType[issue.issueType] =
      (summary.issuesByType[issue.issueType] || 0) + 1;
  }

  printSummary(summary);

  // Queue for re-hunt if requested
  if (values.queue && summary.toolsNeedingReHunt > 0) {
    console.log('\nQueuing tools for re-hunt...');

    // Deduplicate - one entry per tool that can be fixed
    const toolsToQueue = new Map<
      string,
      { id: string; name: string; contextTitle?: string }
    >();

    for (const issue of allIssues) {
      if (issue.canQueue && !toolsToQueue.has(issue.toolId)) {
        toolsToQueue.set(issue.toolId, {
          id: issue.toolId,
          name: issue.toolName,
          contextTitle: issue.contextTitle,
        });
      }
    }

    const queued = await queueForReHunt(Array.from(toolsToQueue.values()), priority, dryRun);

    console.log(`\nQueued ${queued} tools for re-hunting`);
  }

  // Exit with error code if critical issues found
  if (summary.issuesBySeverity.critical > 0) {
    process.exit(1);
  }

  process.exit(0);
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
