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
        JSON.stringify({ error: 'Invalid content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let records: ContentIdea[];

    // Try to detect format: JSON array or CSV
    const trimmed = csv_content.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      // JSON format (array or single object)
      try {
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // CSV format
      try {
        records = parse(trimmed, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_quotes: true,
        }) as ContentIdea[];
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Invalid CSV format: ' + (err instanceof Error ? err.message : 'Parse error') }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No records found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const idea of records) {
      try {
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
            tool_name: idea.tool_name || null,
            context_query: idea.context_query,
            content_type: idea.content_type,
            pillar: idea.pillar,
            target_audience: idea.target_audience,
            priority: parseInt(String(idea.priority), 10),
            notes: idea.notes || null,
            status: 'pending',
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
