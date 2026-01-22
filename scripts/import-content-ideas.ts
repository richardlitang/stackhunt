/**
 * Import Content Ideas from CSV
 *
 * Parses Gemini-generated CSV and inserts into content_ideas table.
 * Links to existing tools where applicable.
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ContentIdea {
  keyword: string;
  tool_name: string;
  context_query: string;
  content_type: string;
  pillar: string;
  target_audience: string;
  priority: number;
  notes: string;
}

async function importContentIdeas(csvPath: string) {
  console.log(`Reading CSV from: ${csvPath}`);

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as ContentIdea[];

  console.log(`Parsed ${records.length} content ideas`);

  // Get all tools for mapping
  const { data: tools, error: toolsError } = await supabase
    .from('tools')
    .select('id, name, slug');

  if (toolsError) {
    console.error('Failed to fetch tools:', toolsError);
    process.exit(1);
  }

  const toolMap = new Map(tools?.map(t => [t.name.toLowerCase(), t]) || []);

  let inserted = 0;
  let skipped = 0;

  for (const idea of records) {
    // Try to find matching tool
    let toolId: string | null = null;

    if (idea.tool_name) {
      const tool = toolMap.get(idea.tool_name.toLowerCase());
      if (tool) {
        toolId = tool.id;
      } else {
        console.warn(`Tool not found: ${idea.tool_name}`);
      }
    }

    // Check if already exists (by keyword)
    const { data: existing } = await supabase
      .from('content_ideas')
      .select('id')
      .eq('keyword', idea.keyword)
      .single();

    if (existing) {
      console.log(`Skipping duplicate: ${idea.keyword}`);
      skipped++;
      continue;
    }

    // Insert content idea
    const { error: insertError } = await supabase
      .from('content_ideas')
      .insert({
        keyword: idea.keyword,
        tool_id: toolId,
        context_query: idea.context_query,
        content_type: idea.content_type,
        pillar: idea.pillar,
        target_audience: idea.target_audience,
        priority: parseInt(String(idea.priority), 10),
        notes: idea.notes || null,
        status: 'backlog',
      });

    if (insertError) {
      console.error(`Failed to insert ${idea.keyword}:`, insertError);
    } else {
      console.log(`✓ Inserted: ${idea.keyword} (${idea.content_type}, priority ${idea.priority})`);
      inserted++;
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
}

// Main
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: tsx scripts/import-content-ideas.ts <path-to-csv>');
  process.exit(1);
}

const resolvedPath = path.resolve(csvPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

importContentIdeas(resolvedPath).catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
