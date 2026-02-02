/**
 * Admin API: Upload CSV to Hunt Queue
 * POST /api/admin/hunt-queue/upload-csv
 *
 * Accepts CSV file with format:
 * name,website,category
 * Notion,https://notion.so,productivity
 * Linear,https://linear.app,project-management
 *
 * Validation:
 * - Max 1000 rows
 * - Max 1MB file size
 * - Valid URLs
 * - Deduplication on tool_url
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { parse } from 'csv-parse/sync';
import { validateSession, COOKIE_NAME, isLegacyToken, validateLegacyToken } from '@/lib/auth';

export const prerender = false;

// Helper to validate admin auth
async function validateAdminAuth(cookies: any): Promise<boolean> {
  const sessionToken = cookies.get(COOKIE_NAME)?.value;
  if (!sessionToken) return false;

  if (isLegacyToken(sessionToken)) {
    return validateLegacyToken(sessionToken);
  }

  const session = await validateSession(sessionToken);
  return session.valid;
}

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_ROWS = 1000;

interface CSVRow {
  name: string;
  website: string;
  category?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate CSV rows
 */
function validateRows(rows: CSVRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenUrls = new Set<string>();

  if (rows.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'CSV file is empty',
    });
    return errors;
  }

  if (rows.length > MAX_ROWS) {
    errors.push({
      row: 0,
      field: 'file',
      message: `Too many rows. Maximum ${MAX_ROWS} allowed, got ${rows.length}`,
    });
    return errors;
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because 1-indexed and header row

    // Validate name
    if (!row.name || row.name.trim() === '') {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Tool name is required',
      });
    } else if (row.name.length > 100) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Tool name too long (max 100 characters)',
        value: row.name,
      });
    }

    // Validate website
    if (!row.website || row.website.trim() === '') {
      errors.push({
        row: rowNum,
        field: 'website',
        message: 'Website URL is required',
      });
    } else if (!isValidUrl(row.website)) {
      errors.push({
        row: rowNum,
        field: 'website',
        message: 'Invalid URL format',
        value: row.website,
      });
    } else {
      // Check for duplicates within CSV
      const normalizedUrl = row.website.toLowerCase().trim();
      if (seenUrls.has(normalizedUrl)) {
        errors.push({
          row: rowNum,
          field: 'website',
          message: 'Duplicate URL in CSV',
          value: row.website,
        });
      } else {
        seenUrls.add(normalizedUrl);
      }
    }

    // Validate category (optional)
    if (row.category && row.category.length > 50) {
      errors.push({
        row: rowNum,
        field: 'category',
        message: 'Category too long (max 50 characters)',
        value: row.category,
      });
    }
  });

  return errors;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Validate admin session
  if (!await validateAdminAuth(cookies)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Early content-length check to reject oversized requests before parsing
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE * 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request too large',
        }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Content-Type must be multipart/form-data',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No file provided',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check file type
    if (!file.name.endsWith('.csv')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only CSV files are allowed',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse CSV
    const text = await file.text();
    let rows: CSVRow[];

    try {
      rows = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true,
      }) as CSVRow[];
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `CSV parsing error: ${error.message}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate rows
    const validationErrors = validateRows(rows);

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          errors: validationErrors.slice(0, 10), // Return first 10 errors
          totalErrors: validationErrors.length,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert into database
    const admin = getAdminClient();
    const insertData = rows.map((row) => ({
      tool_name: row.name.trim(),
      tool_url: row.website.trim(),
      category_hint: row.category?.trim() || null,
      source: 'csv',
      priority: 3, // Default priority
      status: 'pending',
    }));

    // Use upsert to handle duplicates gracefully
    const { data, error } = await admin
      .from('hunt_queue')
      .upsert(insertData, {
        onConflict: 'tool_url',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      console.error('Database insert error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${error.message}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const insertedCount = data?.length || 0;
    const duplicateCount = rows.length - insertedCount;

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        duplicates: duplicateCount,
        total: rows.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('CSV upload error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
