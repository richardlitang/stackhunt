#!/usr/bin/env npx tsx
/**
 * QA Quality Review Script
 *
 * Runs AI evaluation on tools that have been flagged for quality review
 * (due to user corrections, confirmed issues, or low votes).
 *
 * This is the "smart" quality check - only runs on content with problem signals,
 * making it cost-efficient compared to blanket AI reviews.
 *
 * Usage:
 *   npm run qa:quality-review                    # Process up to 10 flagged tools
 *   npm run qa:quality-review -- --limit=5      # Process up to 5
 *   npm run qa:quality-review -- --dry-run      # Preview without changes
 *   npm run qa:quality-review -- --tool="Slack" # Review specific tool
 *
 * @module scripts/qa-quality-review
 */

import { parseArgs } from 'util';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

function printHelp(): void {
  console.log(`
StackHunt QA Quality Review
===========================

Run AI evaluation on tools flagged for quality review.
Only reviews content with problem signals (corrections, low votes).

Usage:
  npm run qa:quality-review                    Process flagged tools
  npm run qa:quality-review -- [options]       Process with options

Options:
  -l, --limit <n>          Max tools to review (default: 10)
  -t, --tool <name>        Review specific tool by name
  --tool-id <uuid>         Review specific tool by ID
  --dry-run                Preview without making changes
  --auto-improve           Automatically run hunts on issues (default: queue only)
  -v, --verbose            Show detailed output
  -h, --help               Show this help

Review Outcomes:
  improved       - Content was re-hunted and updated
  verified_ok    - AI confirms content is accurate (false alarm)
  needs_manual   - Issues too complex for auto-fix, needs admin
  skipped        - Skipped (e.g., tool no longer exists)

Examples:
  npm run qa:quality-review                    # Process up to 10 flagged
  npm run qa:quality-review -- --limit=5      # Process up to 5
  npm run qa:quality-review -- --dry-run      # Preview mode
  npm run qa:quality-review -- --auto-improve # Auto-fix issues
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

if (!GEMINI_API_KEY) {
  console.error('Missing required: GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const DEFAULT_LIMIT = 10;
const RATE_LIMIT_DELAY_MS = 2000;

// ============================================================================
// TYPES
// ============================================================================

interface FlaggedTool {
  tool_id: string;
  tool_name: string;
  tool_slug: string;
  review_reason: string;
  correction_count: number;
  confirmed_corrections: number;
  flagged_at: string;
  days_since_flagged: number;
}

interface ToolWithData {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  short_description: string | null;
  long_description: string | null;
  reviews: Array<{
    id: string;
    score: number | null;
    summary_markdown: string | null;
    pros: unknown[];
    cons: unknown[];
    context: { title: string } | null;
  }>;
}

interface Correction {
  id: string;
  field_name: string;
  correction_text: string;
  ai_verification_result: string | null;
  created_at: string;
}

interface QualityEvaluation {
  overall_quality: 'good' | 'needs_improvement' | 'poor';
  confidence: number; // 0-1
  issues_found: string[];
  corrections_valid: string[]; // Which user corrections appear valid
  corrections_invalid: string[]; // Which appear incorrect
  recommendation: 'verify_ok' | 'rehunt' | 'manual_review';
  reasoning: string;
}

interface ReviewResult {
  toolName: string;
  reason: string;
  outcome: 'improved' | 'verified_ok' | 'needs_manual' | 'skipped';
  details: string;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function getFlaggedTools(limit: number): Promise<FlaggedTool[]> {
  const { data, error } = await supabase.rpc('get_tools_needing_quality_review', {
    p_limit: limit,
  });

  if (error) {
    console.error('Failed to fetch flagged tools:', error.message);
    return [];
  }

  return (data as FlaggedTool[]) || [];
}

async function getToolData(toolId: string): Promise<ToolWithData | null> {
  const { data, error } = await supabase
    .from('tools')
    .select(`
      id,
      name,
      slug,
      website,
      short_description,
      long_description,
      reviews (
        id,
        score,
        summary_markdown,
        pros,
        cons,
        context:contexts (title)
      )
    `)
    .eq('id', toolId)
    .single();

  if (error) {
    console.error('Failed to fetch tool data:', error.message);
    return null;
  }

  return data as unknown as ToolWithData;
}

async function getToolCorrections(toolId: string): Promise<Correction[]> {
  const { data, error } = await supabase
    .from('corrections')
    .select('id, field_name, correction_text, ai_verification_result, created_at')
    .eq('tool_id', toolId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch corrections:', error.message);
    return [];
  }

  return (data as Correction[]) || [];
}

async function findToolByName(name: string): Promise<FlaggedTool | null> {
  const { data } = await supabase
    .from('tools')
    .select(`
      id,
      name,
      slug,
      quality_review_reason,
      correction_count,
      confirmed_correction_count,
      quality_review_flagged_at
    `)
    .ilike('name', `%${name}%`)
    .limit(1)
    .single();

  if (!data) return null;

  return {
    tool_id: data.id,
    tool_name: data.name,
    tool_slug: data.slug,
    review_reason: data.quality_review_reason || 'manual',
    correction_count: data.correction_count || 0,
    confirmed_corrections: data.confirmed_correction_count || 0,
    flagged_at: data.quality_review_flagged_at || new Date().toISOString(),
    days_since_flagged: 0,
  };
}

// ============================================================================
// AI EVALUATION
// ============================================================================

async function evaluateToolQuality(
  tool: ToolWithData,
  corrections: Correction[]
): Promise<QualityEvaluation> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const review = tool.reviews[0];
  const prosText = review?.pros?.map((p: unknown) =>
    typeof p === 'string' ? p : (p as { text: string }).text
  ).join('\n- ') || 'None';
  const consText = review?.cons?.map((c: unknown) =>
    typeof c === 'string' ? c : (c as { text: string }).text
  ).join('\n- ') || 'None';

  const correctionsText = corrections.length > 0
    ? corrections.map(c =>
        `- [${c.field_name}] ${c.correction_text} (AI verified: ${c.ai_verification_result || 'pending'})`
      ).join('\n')
    : 'No corrections submitted';

  const prompt = `You are a quality auditor for a software review website. Evaluate the quality and accuracy of this tool's content.

TOOL: ${tool.name}
Website: ${tool.website || 'Unknown'}

CURRENT CONTENT:
Description: ${tool.short_description || 'None'}

Summary: ${review?.summary_markdown || 'None'}

Pros:
- ${prosText}

Cons:
- ${consText}

Score: ${review?.score || 'None'}/100

USER-SUBMITTED CORRECTIONS:
${correctionsText}

EVALUATION CRITERIA:
1. Factual accuracy - Are the claims verifiable and current?
2. Helpfulness - Does the summary actually help users make decisions?
3. Specificity - Are pros/cons specific to this tool or generic?
4. Balance - Are both pros and cons fair and substantive?
5. Corrections validity - Do the user corrections appear valid?

Based on your evaluation, respond with JSON:
{
  "overall_quality": "good" | "needs_improvement" | "poor",
  "confidence": 0.0-1.0,
  "issues_found": ["issue1", "issue2"],
  "corrections_valid": ["valid correction 1"],
  "corrections_invalid": ["invalid correction 1"],
  "recommendation": "verify_ok" | "rehunt" | "manual_review",
  "reasoning": "Brief explanation of your assessment"
}

Guidelines:
- "verify_ok" if content is accurate and corrections are invalid/minor
- "rehunt" if there are clear factual issues that re-researching would fix
- "manual_review" if issues are complex (e.g., disputed claims, nuanced errors)`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]) as QualityEvaluation;
  } catch (error) {
    console.error('AI evaluation failed:', error);
    // Return a safe default that triggers manual review
    return {
      overall_quality: 'needs_improvement',
      confidence: 0.3,
      issues_found: ['AI evaluation failed'],
      corrections_valid: [],
      corrections_invalid: [],
      recommendation: 'manual_review',
      reasoning: 'AI evaluation failed, requires manual review',
    };
  }
}

// ============================================================================
// ACTIONS
// ============================================================================

async function queueForReHunt(
  toolName: string,
  priority: number = 70
): Promise<boolean> {
  const { error } = await supabase.from('hunt_queue').insert({
    tool_name: toolName,
    priority,
    source: 'quality_review',
    hunt_type: 'refresh',
  });

  if (error) {
    if (error.code === '23505') {
      console.log(`  Already in queue: ${toolName}`);
      return true;
    }
    console.error(`  Failed to queue ${toolName}:`, error.message);
    return false;
  }

  return true;
}

async function runImmediateHunt(toolName: string): Promise<boolean> {
  if (!SERPER_API_KEY) {
    console.error('  SERPER_API_KEY required for immediate hunts');
    return false;
  }

  try {
    const { Hunter } = await import('../src/lib/hunter');
    const hunter = new Hunter({
      supabaseUrl: SUPABASE_URL!,
      supabaseServiceKey: SUPABASE_SERVICE_KEY!,
      geminiApiKey: GEMINI_API_KEY!,
      serperApiKey: SERPER_API_KEY!,
      isDraftMode: false,
    });

    const result = await hunter.hunt({ toolName });
    return result.success;
  } catch (error) {
    console.error('  Hunt failed:', error);
    return false;
  }
}

async function markReviewComplete(
  toolId: string,
  result: 'improved' | 'verified_ok' | 'needs_manual' | 'skipped'
): Promise<void> {
  const { error } = await supabase.rpc('complete_quality_review', {
    p_tool_id: toolId,
    p_result: result,
  });

  if (error) {
    console.error('Failed to mark review complete:', error.message);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string', short: 'l' },
      tool: { type: 'string', short: 't' },
      'tool-id': { type: 'string' },
      'dry-run': { type: 'boolean' },
      'auto-improve': { type: 'boolean' },
      verbose: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const limit = parseInt(values.limit as string) || DEFAULT_LIMIT;
  const dryRun = values['dry-run'] || false;
  const autoImprove = values['auto-improve'] || false;
  const verbose = values.verbose || false;

  console.log('═'.repeat(60));
  console.log('StackHunt QA Quality Review');
  console.log('═'.repeat(60));
  console.log(`Max tools to review: ${limit}`);
  if (dryRun) console.log('Mode: DRY RUN (no changes)');
  if (autoImprove) console.log('Auto-improve: ON (will run hunts)');
  console.log('');

  // Get flagged tools
  let flaggedTools: FlaggedTool[] = [];

  if (values.tool) {
    const tool = await findToolByName(values.tool as string);
    if (!tool) {
      console.error(`Tool not found: ${values.tool}`);
      process.exit(1);
    }
    flaggedTools = [tool];
    console.log(`Reviewing specific tool: ${tool.tool_name}`);
  } else if (values['tool-id']) {
    const toolData = await getToolData(values['tool-id'] as string);
    if (!toolData) {
      console.error(`Tool not found with ID: ${values['tool-id']}`);
      process.exit(1);
    }
    flaggedTools = [{
      tool_id: toolData.id,
      tool_name: toolData.name,
      tool_slug: toolData.slug,
      review_reason: 'manual',
      correction_count: 0,
      confirmed_corrections: 0,
      flagged_at: new Date().toISOString(),
      days_since_flagged: 0,
    }];
    console.log(`Reviewing specific tool: ${toolData.name}`);
  } else {
    flaggedTools = await getFlaggedTools(limit);
    console.log(`Found ${flaggedTools.length} tools flagged for review`);
  }

  if (flaggedTools.length === 0) {
    console.log('\nNo tools need quality review!');
    console.log('Tools are flagged when:');
    console.log('  - 2+ user corrections are submitted');
    console.log('  - A correction is confirmed by AI verification');
    console.log('  - Reviews receive 3+ downvotes');
    process.exit(0);
  }

  // Display flagged tools
  console.log('\n' + '-'.repeat(60));
  console.log('Tools flagged for review:');
  console.log('-'.repeat(60));
  flaggedTools.forEach((t, i) => {
    console.log(`${i + 1}. ${t.tool_name}`);
    console.log(`   Reason: ${t.review_reason} | Corrections: ${t.correction_count} (${t.confirmed_corrections} confirmed)`);
    console.log(`   Flagged: ${t.days_since_flagged} days ago`);
  });

  if (dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('[DRY RUN] No evaluations performed');
    console.log('═'.repeat(60));
    process.exit(0);
  }

  // Process each tool
  console.log('\n' + '═'.repeat(60));
  console.log('Running AI quality evaluations...');
  console.log('═'.repeat(60));

  const results: ReviewResult[] = [];

  for (let i = 0; i < flaggedTools.length; i++) {
    const flagged = flaggedTools[i];
    console.log(`\n[${i + 1}/${flaggedTools.length}] Evaluating: ${flagged.tool_name}`);

    // Get full tool data and corrections
    const toolData = await getToolData(flagged.tool_id);
    if (!toolData) {
      console.log('  Skipped: Tool not found');
      results.push({
        toolName: flagged.tool_name,
        reason: flagged.review_reason,
        outcome: 'skipped',
        details: 'Tool not found in database',
      });
      await markReviewComplete(flagged.tool_id, 'skipped');
      continue;
    }

    const corrections = await getToolCorrections(flagged.tool_id);
    if (verbose) {
      console.log(`  Corrections: ${corrections.length}`);
    }

    // Run AI evaluation
    console.log('  Running AI evaluation...');
    const evaluation = await evaluateToolQuality(toolData, corrections);

    if (verbose) {
      console.log(`  Quality: ${evaluation.overall_quality} (confidence: ${evaluation.confidence.toFixed(2)})`);
      console.log(`  Issues: ${evaluation.issues_found.join(', ') || 'None'}`);
      console.log(`  Recommendation: ${evaluation.recommendation}`);
    }

    // Take action based on recommendation
    let outcome: 'improved' | 'verified_ok' | 'needs_manual' | 'skipped';
    let details: string;

    switch (evaluation.recommendation) {
      case 'verify_ok':
        console.log('  ✓ Content verified as OK');
        outcome = 'verified_ok';
        details = evaluation.reasoning;
        break;

      case 'rehunt':
        if (autoImprove) {
          console.log('  Running immediate re-hunt...');
          const success = await runImmediateHunt(flagged.tool_name);
          if (success) {
            console.log('  ✓ Content improved');
            outcome = 'improved';
            details = 'Re-hunted successfully';
          } else {
            console.log('  Hunt failed, queuing for retry');
            await queueForReHunt(flagged.tool_name, 80);
            outcome = 'needs_manual';
            details = 'Hunt failed, queued for retry';
          }
        } else {
          console.log('  Queuing for re-hunt...');
          await queueForReHunt(flagged.tool_name, 70);
          outcome = 'improved'; // Will be improved when queue processes
          details = 'Queued for re-hunt';
        }
        break;

      case 'manual_review':
      default:
        console.log('  → Flagged for manual review');
        outcome = 'needs_manual';
        details = `Issues: ${evaluation.issues_found.join(', ')}. ${evaluation.reasoning}`;
        break;
    }

    // Mark review complete
    await markReviewComplete(flagged.tool_id, outcome);

    results.push({
      toolName: flagged.tool_name,
      reason: flagged.review_reason,
      outcome,
      details,
    });

    // Rate limit
    if (i < flaggedTools.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  // Summary
  const verified = results.filter(r => r.outcome === 'verified_ok').length;
  const improved = results.filter(r => r.outcome === 'improved').length;
  const manual = results.filter(r => r.outcome === 'needs_manual').length;
  const skipped = results.filter(r => r.outcome === 'skipped').length;

  console.log('\n' + '═'.repeat(60));
  console.log('Quality Review Summary');
  console.log('═'.repeat(60));
  console.log(`Tools reviewed:    ${results.length}`);
  console.log(`Verified OK:       ${verified} (content is accurate)`);
  console.log(`Improved/Queued:   ${improved} (will be re-hunted)`);
  console.log(`Needs Manual:      ${manual} (complex issues)`);
  console.log(`Skipped:           ${skipped}`);

  if (manual > 0) {
    console.log('\nTools needing manual review:');
    results
      .filter(r => r.outcome === 'needs_manual')
      .forEach(r => console.log(`  - ${r.toolName}: ${r.details}`));
  }

  console.log('═'.repeat(60));

  process.exit(manual > 0 ? 1 : 0);
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
