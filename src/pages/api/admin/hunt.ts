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
  runInstructions?: string;
  priority?: number;
  huntType?: 'full' | 'refresh' | 'price_only';
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limit check (30 queue additions/minute)
  const ip = getClientIP(request, clientAddress);
  const hashedIP = hashIdentifier(ip);
  const rateLimit = await checkRateLimit(hashedIP, '/api/admin/hunt', {
    maxRequests: 30,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: HuntRequest = await request.json();
    const { toolName, contextTitle, categorySlug, runInstructions, priority, huntType } = body;

    // Validate toolName
    if (!toolName || typeof toolName !== 'string') {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Tool name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    // Input length validation to prevent DoS
    const MAX_TOOL_NAME_LENGTH = 255;
    const MAX_CONTEXT_TITLE_LENGTH = 500;
    const MAX_CATEGORY_SLUG_LENGTH = 100;
    const MAX_RUN_INSTRUCTIONS_LENGTH = 2000;

    if (toolName.length > MAX_TOOL_NAME_LENGTH) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({
            success: false,
            error: `Tool name exceeds ${MAX_TOOL_NAME_LENGTH} characters`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        rateLimit
      );
    }

    if (contextTitle && contextTitle.length > MAX_CONTEXT_TITLE_LENGTH) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({
            success: false,
            error: `Context title exceeds ${MAX_CONTEXT_TITLE_LENGTH} characters`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        rateLimit
      );
    }

    if (categorySlug && categorySlug.length > MAX_CATEGORY_SLUG_LENGTH) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({
            success: false,
            error: `Category slug exceeds ${MAX_CATEGORY_SLUG_LENGTH} characters`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        rateLimit
      );
    }
    if (runInstructions && runInstructions.length > MAX_RUN_INSTRUCTIONS_LENGTH) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({
            success: false,
            error: `Run instructions exceed ${MAX_RUN_INSTRUCTIONS_LENGTH} characters`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        rateLimit
      );
    }

    // Validate huntType enum
    const validHuntTypes = ['full', 'refresh', 'price_only'];
    if (huntType && !validHuntTypes.includes(huntType)) {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Invalid hunt type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    // Validate and constrain priority
    const safePriority = Math.max(0, Math.min(100, priority ?? 50));

    const normalizedInstructions =
      typeof runInstructions === 'string' ? runInstructions.trim() : '';

    const adminClient = getAdminClient();

    // Insert into hunt_queue instead of running hunter directly
    const { data, error } = await adminClient
      .from('hunt_queue')
      .insert({
        tool_name: toolName.trim(),
        context_title: contextTitle?.trim() || null,
        category_slug: categorySlug?.trim() || null,
        error_details: normalizedInstructions
          ? { admin_instructions: normalizedInstructions }
          : null,
        priority: safePriority,
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
    console.error('Hunt queue API error:', (err as Error).message);
    return addRateLimitHeaders(
      new Response(JSON.stringify({ success: false, error: 'Failed to add to queue' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
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
  const rateLimit = await checkRateLimit(hashedIP, '/api/admin/hunt', {
    maxRequests: 60,
    windowSeconds: 60,
  });

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
    console.error('Hunt queue status error:', (err as Error).message);
    return addRateLimitHeaders(
      new Response(JSON.stringify({ success: false, error: 'Failed to fetch queue status' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
      rateLimit
    );
  }
};
