/**
 * Editorial Topic Management API
 * GET/PATCH/DELETE /api/admin/editorial/topics/[id]
 *
 * Manages individual editorial topics (approve, reject, update)
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

// GET: Get a single topic by ID
export const GET: APIRoute = async ({ params }) => {
  const admin = getAdminClient();
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Topic ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await admin
    .from('editorial_topics')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.code === 'PGRST116' ? 404 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ topic: data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PATCH: Update a topic (approve, reject, or modify)
export const PATCH: APIRoute = async ({ params, request }) => {
  const admin = getAdminClient();
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Topic ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { action, ...updates } = body;

    // Handle specific actions
    if (action === 'approve') {
      const { data, error } = await admin.rpc('approve_topic', {
        p_topic_id: id,
        p_admin_id: null, // Would come from session in production
        p_auto_queue: body.auto_queue || false,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, result: data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject') {
      const { data, error } = await admin.rpc('reject_topic', {
        p_topic_id: id,
        p_reason: body.reason || null,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generic update for other fields
    const allowedFields = [
      'topic',
      'topic_type',
      'description',
      'priority_score',
      'revenue_potential',
      'suggested_tools',
      'suggested_angle',
      'target_audience',
      'scheduled_for',
      'is_evergreen',
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await admin
      .from('editorial_topics')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, topic: data }), {
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

// DELETE: Archive a topic
export const DELETE: APIRoute = async ({ params }) => {
  const admin = getAdminClient();
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Topic ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Don't actually delete, just archive
  const { error } = await admin
    .from('editorial_topics')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
