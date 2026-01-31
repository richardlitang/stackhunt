/**
 * API Endpoint: POST /api/admin/queue-tool
 *
 * Queue a tool for re-hunting to improve data quality.
 * Admin-only endpoint.
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSecret = import.meta.env.ADMIN_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Simple admin auth check (enhance with proper auth later)
    const authHeader = request.headers.get('authorization');
    const adminCookie = request.headers.get('cookie')?.includes('admin-session');

    // Allow if admin session or valid auth header
    if (!adminCookie && authHeader !== `Bearer ${adminSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const {
      toolId,
      toolName,
      priority = 7,
      huntType = 'refresh',
      source = 'admin',
    } = await request.json();

    if (!toolId || !toolName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: toolId, toolName' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already in queue
    const { data: existing } = await supabase
      .from('hunt_queue')
      .select('id, status')
      .eq('item_id', toolId)
      .in('status', ['pending', 'processing'])
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Tool is already in the queue',
          queueId: existing.id,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add to queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('hunt_queue')
      .insert({
        item_id: toolId,
        item_name: toolName,
        priority,
        source,
        hunt_type: huntType,
        metadata: {
          reason: 'quality_improvement',
          queued_from: 'admin_quality_dashboard',
          queued_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (queueError) {
      console.error('Error queueing tool:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to queue tool', details: queueError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${toolName} queued for re-hunt`,
        queueId: queueEntry.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in queue-tool API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
