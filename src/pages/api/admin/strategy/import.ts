/**
 * API: Strategy Import
 * POST /api/admin/strategy/import
 *
 * Handles CSV file upload and imports keywords into content_ideas table.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { parse } from 'csv-parse/sync';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const admin = getAdminClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file content
    const csvContent = await file.text();

    // Parse CSV
    let records: Array<Record<string, string>>;
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to parse CSV: ${(err as Error).message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'CSV file is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create import batch
    const { data: batch, error: batchError } = await admin
      .from('import_batches')
      .insert({
        filename: file.name,
        total_rows: records.length,
        status: 'processing',
      })
      .select()
      .single();

    if (batchError) {
      console.error('Failed to create import batch:', batchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create import batch' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process each row
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of records) {
      // Map CSV columns (flexible column names)
      const keyword = row.keyword || row.Keyword || row.term || row.Term;
      const toolName = row.tool_name || row.tool || row.Tool || row['Tool Name'];
      const contextQuery = row.context_query || row.context || row.Context || row.audience;
      const searchVolume = parseInt(row.search_volume || row.volume || row.Volume || '0', 10);
      const keywordDifficulty = parseInt(row.keyword_difficulty || row.difficulty || row.KD || row.kd || '50', 10);
      const cpc = parseFloat(row.cpc || row.CPC || '0');

      if (!keyword && !toolName) {
        skipped++;
        continue;
      }

      // Insert into content_ideas
      const { error: insertError } = await admin
        .from('content_ideas')
        .insert({
          keyword: keyword || toolName,
          tool_name: toolName || keyword,
          context_query: contextQuery || null,
          search_volume: searchVolume,
          keyword_difficulty: keywordDifficulty,
          cpc: cpc,
          source: 'csv_import',
          import_batch_id: batch.id,
          status: 'pending',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate - already exists
          skipped++;
        } else {
          console.error(`Error inserting "${keyword || toolName}":`, insertError);
          errors++;
        }
      } else {
        imported++;
      }
    }

    // Update batch status
    await admin
      .from('import_batches')
      .update({
        imported_rows: imported,
        skipped_rows: skipped,
        status: errors > 0 ? 'completed_with_errors' : 'completed',
      })
      .eq('id', batch.id);

    // Redirect back to strategy page
    return redirect('/admin/strategy');
  } catch (err) {
    console.error('Import error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Import failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
