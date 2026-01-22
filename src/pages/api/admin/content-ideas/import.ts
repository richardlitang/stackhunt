/**
 * Admin API: Import Content Ideas from CSV
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';
import { parse } from 'csv-parse/sync';

export const prerender = false;

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

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verify admin session
  const sessionToken = cookies.get('stackhunt_admin_session')?.value;
  if (!sessionToken) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const sessionValidation = await validateSession(sessionToken);
  if (!sessionValidation.valid) {
    return new Response(
      JSON.stringify({ error: 'Invalid session' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { csv_content } = body;

    if (!csv_content || typeof csv_content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid CSV content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse CSV
    const records = parse(csv_content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
    }) as ContentIdea[];

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No records found in CSV' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all tools for mapping
    const { data: tools, error: toolsError } = await supabase
      .from('tools')
      .select('id, name, slug');

    if (toolsError) {
      console.error('Failed to fetch tools:', toolsError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const toolMap = new Map(tools?.map(t => [t.name.toLowerCase(), t]) || []);

    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const idea of records) {
      try {
        // Try to find matching tool
        let toolId: string | null = null;

        if (idea.tool_name) {
          const tool = toolMap.get(idea.tool_name.toLowerCase());
          if (tool) {
            toolId = tool.id;
          }
        }

        // Check if already exists (by keyword)
        const { data: existing } = await supabase
          .from('content_ideas')
          .select('id')
          .eq('keyword', idea.keyword)
          .single();

        if (existing) {
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
          failed++;
          errors.push(`${idea.keyword}: ${insertError.message}`);
        } else {
          inserted++;
        }
      } catch (err) {
        failed++;
        errors.push(`${idea.keyword}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        skipped,
        failed,
        errors: errors.slice(0, 10), // Limit error messages
        total: records.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
