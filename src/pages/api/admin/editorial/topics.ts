/**
 * Editorial Topics API
 * GET/POST /api/admin/editorial/topics
 *
 * Manages editorial topic proposals
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

// GET: List topics with filters
export const GET: APIRoute = async ({ url }) => {
  const admin = getAdminClient();

  const status = url.searchParams.get('status') || 'proposed';
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = admin
    .from('editorial_topics')
    .select('*', { count: 'exact' })
    .order('priority_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ topics: data, total: count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: Create a new topic manually
export const POST: APIRoute = async ({ request }) => {
  const admin = getAdminClient();

  try {
    const body = await request.json();

    const { data, error } = await admin
      .from('editorial_topics')
      .insert({
        topic: body.topic,
        topic_type: body.topic_type || 'best_list',
        description: body.description,
        source: 'manual',
        priority_score: body.priority_score || 50,
        revenue_potential: body.revenue_potential || 'unknown',
        suggested_tools: body.suggested_tools || [],
        suggested_angle: body.suggested_angle,
        target_audience: body.target_audience,
        status: 'proposed',
        proposed_by: 'admin',
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.code === '23505' ? 409 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, topic: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
