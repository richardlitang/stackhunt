#!/usr/bin/env tsx
/**
 * Standalone Constraints Extraction Script
 *
 * Extracts hard limits and hidden costs for existing tools in the database.
 * Runs independently from the main hunt pipeline to avoid schema complexity issues.
 *
 * Usage:
 *   npm run constraints -- --tool="Airtable"
 *   npm run constraints -- --tool-id="uuid"
 *   npm run constraints -- --batch=10  # Process 10 tools without constraints
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';
import { extractConstraints } from '../src/lib/hunter/phases/constraints-extraction';
import { resolvePlanId } from '../src/lib/pricing/constraints';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

interface CliArgs {
  tool?: string;
  toolId?: string;
  batch?: number;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--tool=')) {
      args.tool = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--tool-id=')) {
      args.toolId = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--batch=')) {
      args.batch = parseInt(arg.split('=')[1], 10);
    }
  }
  return args;
}

async function fetchPricingPageContent(url: string): Promise<string> {
  // Simple fetch - in production this should use the scraper service
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StackHunt/1.0)',
      },
    });
    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch ${url}: ${response.status}`);
      return '';
    }
    return await response.text();
  } catch (error) {
    console.warn(`⚠️  Error fetching ${url}:`, error);
    return '';
  }
}

async function extractConstraintsForTool(toolId: string, toolName: string) {
  console.log(`\n📋 Processing: ${toolName}`);

  // Fetch tool data
  const { data: tool, error } = await supabase
    .from('items')
    .select('id, name, slug, specs, metadata')
    .eq('id', toolId)
    .single();

  if (error || !tool) {
    console.error(`❌ Failed to fetch tool: ${error?.message}`);
    return false;
  }

  // Check if already has constraints
  const specs = tool.specs as Record<string, any> | null;
  if (specs && 'constraints' in specs) {
    console.log(`   ⏭️  Already has constraints, skipping`);
    return false;
  }

  // Get pricing page URL from metadata
  const metadata = tool.metadata as Record<string, any> | null;
  const pricingPageUrl = metadata?.smp_pricing?.pricing_page_url || metadata?.website_url;

  if (!pricingPageUrl) {
    console.log(`   ⚠️  No pricing page URL found, skipping`);
    return false;
  }

  console.log(`   📄 Fetching: ${pricingPageUrl}`);
  const content = await fetchPricingPageContent(pricingPageUrl);

  if (!content || content.length < 100) {
    console.log(`   ⚠️  Insufficient content (${content.length} chars), skipping`);
    return false;
  }

  // Extract constraints
  const constraints = await extractConstraints(
    {
      toolName: tool.name,
      pricingPageUrl,
      scrapedContent: content,
      geminiApiKey,
    },
    {
      log: (msg) => console.log(`   ${msg}`),
    }
  );

  if (!constraints || (!constraints.hard_limits?.length && !constraints.hidden_costs?.length)) {
    console.log(`   ℹ️  No constraints found`);
    return false;
  }

  // Resolve plan IDs if we have pricing data
  if (constraints.hard_limits && metadata?.smp_pricing?.plans) {
    const plans = metadata.smp_pricing.plans;
    constraints.hard_limits = constraints.hard_limits.map(limit => {
      const planId = resolvePlanId(limit.plan_name_match, plans);
      const sourceUrl = limit.source_url || pricingPageUrl;
      return { ...limit, plan_id: planId, source_url: sourceUrl };
    });
  }

  // Update tool specs
  const updatedSpecs = {
    ...(specs || {}),
    constraints,
  };

  const { error: updateError } = await supabase
    .from('items')
    .update({ specs: updatedSpecs })
    .eq('id', toolId);

  if (updateError) {
    console.error(`   ❌ Failed to update: ${updateError.message}`);
    return false;
  }

  console.log(`   ✅ Saved ${constraints.hard_limits?.length || 0} limits, ${constraints.hidden_costs?.length || 0} hidden costs`);
  return true;
}

async function main() {
  const args = parseArgs();

  console.log('🔍 Constraints Extraction Tool\n');

  if (args.tool) {
    // Extract for specific tool by name
    const { data: tool } = await supabase
      .from('items')
      .select('id, name')
      .eq('type', 'tool')
      .ilike('name', args.tool)
      .limit(1)
      .single();

    if (!tool) {
      console.error(`❌ Tool not found: ${args.tool}`);
      process.exit(1);
    }

    await extractConstraintsForTool(tool.id, tool.name);

  } else if (args.toolId) {
    // Extract for specific tool by ID
    const { data: tool } = await supabase
      .from('items')
      .select('id, name')
      .eq('id', args.toolId)
      .single();

    if (!tool) {
      console.error(`❌ Tool not found: ${args.toolId}`);
      process.exit(1);
    }

    await extractConstraintsForTool(tool.id, tool.name);

  } else if (args.batch) {
    // Extract for multiple tools without constraints
    const { data: tools } = await supabase
      .from('items')
      .select('id, name, specs')
      .eq('type', 'tool')
      .limit(args.batch);

    if (!tools || tools.length === 0) {
      console.log('No tools found');
      process.exit(0);
    }

    // Filter to tools without constraints
    const toolsWithoutConstraints = tools.filter(t => {
      const toolSpecs = t.specs as Record<string, any> | null;
      return !toolSpecs || !toolSpecs.constraints;
    });

    console.log(`Found ${toolsWithoutConstraints.length} tools without constraints`);

    let processed = 0;
    for (const tool of toolsWithoutConstraints.slice(0, args.batch)) {
      const success = await extractConstraintsForTool(tool.id, tool.name);
      if (success) processed++;
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n✅ Processed ${processed}/${toolsWithoutConstraints.length} tools`);

  } else {
    console.log('Usage:');
    console.log('  npm run constraints -- --tool="Airtable"');
    console.log('  npm run constraints -- --tool-id="uuid"');
    console.log('  npm run constraints -- --batch=10');
    process.exit(1);
  }
}

main().catch(console.error);
