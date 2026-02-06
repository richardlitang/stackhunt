/**
 * Editorial Guidelines API
 * GET/POST/PATCH /api/admin/editorial/guidelines
 *
 * Manages editorial guidelines that control AI behavior
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

// GET: List all guidelines
export const GET: APIRoute = async ({ url }) => {
  const admin = getAdminClient();
  const activeOnly = url.searchParams.get('active') !== 'false';

  let query = admin.from('editorial_guidelines').select('*').order('key');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ guidelines: data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: Create a new guideline
export const POST: APIRoute = async ({ request }) => {
  const admin = getAdminClient();

  try {
    const body = await request.json();

    if (!body.key || !body.name || !body.content) {
      return new Response(JSON.stringify({ error: 'key, name, and content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await admin
      .from('editorial_guidelines')
      .insert({
        key: body.key,
        name: body.name,
        description: body.description || null,
        content: body.content,
        is_active: body.is_active !== false,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.code === '23505' ? 409 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, guideline: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH: Update a guideline by key
export const PATCH: APIRoute = async ({ request }) => {
  const admin = getAdminClient();

  try {
    const body = await request.json();

    if (!body.key) {
      return new Response(JSON.stringify({ error: 'key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: Record<string, unknown> = {};
    if ('name' in body) updates.name = body.name;
    if ('description' in body) updates.description = body.description;
    if ('content' in body) updates.content = body.content;
    if ('is_active' in body) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await admin
      .from('editorial_guidelines')
      .update(updates)
      .eq('key', body.key)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.code === 'PGRST116' ? 404 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, guideline: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
