/**
 * API: Queue Hunt from Admin UI (Restaurant Model)
 * POST /api/admin/hunt
 *
 * This endpoint does NOT run AI - it only inserts into the hunt_queue.
 * The CLI worker (scripts/hunter.ts) processes the queue.
 *
 * This solves the "Vercel Trap" - no AI work happens in serverless functions.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import {
  checkRateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  getClientIP,
  hashIdentifier,
} from '@/lib/rate-limit';

interface HuntRequest {
  toolName: string;
  contextTitle?: string;
  categorySlug?: string;
  priority?: number;
  huntType?: 'full' | 'refresh' | 'price_only';
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limit check (30 queue additions/minute)
  const ip = getClientIP(request, clientAddress);
  const hashedIP = hashIdentifier(ip);
  const rateLimit = await checkRateLimit(hashedIP, '/api/admin/hunt', 30, 60);

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: HuntRequest = await request.json();
    const { toolName, contextTitle, categorySlug, priority, huntType } = body;

    if (!toolName || typeof toolName !== 'string') {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Tool name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    const adminClient = getAdminClient();

    // Insert into hunt_queue instead of running hunter directly
    const { data, error } = await adminClient
      .from('hunt_queue')
      .insert({
        tool_name: toolName.trim(),
        context_title: contextTitle?.trim() || null,
        category_slug: categorySlug?.trim() || null,
        priority: priority ?? 50,
        hunt_type: huntType || 'full',
        source: 'admin',
      })
      .select('id, tool_name, priority, status')
      .single();

    if (error) {
      // Handle duplicate entry
      if (error.code === '23505') {
        return addRateLimitHeaders(
          new Response(
            JSON.stringify({
              success: false,
              error: 'This tool is already queued for processing',
              code: 'DUPLICATE',
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ),
          rateLimit
        );
      }

      throw error;
    }

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          success: true,
          message: 'Added to hunt queue',
          queueId: data.id,
          toolName: data.tool_name,
          priority: data.priority,
          status: data.status,
          note: 'The CLI worker will process this item. Run: npm run hunt -- --queue process',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      ),
      rateLimit
    );
  } catch (err) {
    console.error('Hunt queue API error:', err);
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ success: false, error: (err as Error).message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ),
      rateLimit
    );
  }
};

/**
 * GET: Check queue status
 */
export const GET: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIP(request, clientAddress);
  const hashedIP = hashIdentifier(ip);
  const rateLimit = await checkRateLimit(hashedIP, '/api/admin/hunt', 60, 60);

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const adminClient = getAdminClient();

    // Get queue statistics
    const { data: stats } = await adminClient
      .from('hunt_queue')
      .select('status')
      .then(({ data }) => {
        const counts = {
          pending: 0,
          claimed: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        };
        for (const item of data || []) {
          counts[item.status as keyof typeof counts]++;
        }
        return { data: counts };
      });

    // Get recent items
    const { data: recent } = await adminClient
      .from('hunt_queue')
      .select('id, tool_name, context_title, status, priority, created_at, error_message')
      .order('created_at', { ascending: false })
      .limit(10);

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          success: true,
          stats,
          recent,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
      rateLimit
    );
  } catch (err) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ success: false, error: (err as Error).message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ),
      rateLimit
    );
  }
};
