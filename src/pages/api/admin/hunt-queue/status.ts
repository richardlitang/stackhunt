/**
 * Admin API: Hunt Queue Status
 * GET /api/admin/hunt-queue/status?limit=20&status=pending
 *
 * Returns queue items with pagination and filtering.
 * Also returns overall statistics.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status'); // 'pending' | 'processing' | 'completed' | 'failed' | null (all)

    const admin = getAdminClient();

    // Get overall stats
    const { data: statsData, error: statsError } = await admin.rpc(
      'get_hunt_queue_stats'
    );

    if (statsError) {
      console.error('Stats error:', statsError);
    }

    const stats = statsData || {
      pending: 0,
      claimed: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    // Build query
    let query = admin
      .from('hunt_queue')
      .select(
        `
        id,
        tool_name,
        tool_url,
        category_hint,
        context_title,
        category_slug,
        status,
        priority,
        attempts,
        max_attempts,
        claimed_by,
        claimed_at,
        started_at,
        completed_at,
        error_message,
        tool_id,
        context_id,
        review_id,
        created_at
      `
      )
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(Math.min(limit, 100));

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: items, error: itemsError } = await query;

    if (itemsError) {
      console.error('Items query error:', itemsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: itemsError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        items: items || [],
        count: items?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Hunt queue status error:', error);
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
