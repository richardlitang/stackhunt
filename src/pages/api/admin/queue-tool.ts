/**
 * API Endpoint: POST /api/admin/queue-tool
 *
 * Queue a tool for re-hunting to improve data quality.
 * Admin-only endpoint with proper session validation.
 *
 * SECURITY: Validates session token from cookie, not just cookie presence.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { validateSession, COOKIE_NAME, isLegacyToken, validateLegacyToken } from '@/lib/auth';
import { timingSafeEqual } from 'crypto';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Proper session validation - check actual token, not just cookie presence
    const sessionToken = cookies.get(COOKIE_NAME)?.value;
    const authHeader = request.headers.get('authorization');
    const adminSecret = import.meta.env.ADMIN_SECRET;

    let isAuthenticated = false;

    // Method 1: Validate session token from cookie
    if (sessionToken) {
      // Check legacy token format first (backwards compatibility)
      if (isLegacyToken(sessionToken)) {
        isAuthenticated = validateLegacyToken(sessionToken);
      } else {
        // Validate against database
        const session = await validateSession(sessionToken);
        isAuthenticated = session.valid;
      }
    }

    // Method 2: Bearer token auth (for programmatic access)
    if (!isAuthenticated && authHeader && adminSecret) {
      const providedToken = authHeader.replace('Bearer ', '');
      try {
        // Use timing-safe comparison to prevent timing attacks
        const secretBuffer = Buffer.from(adminSecret);
        const providedBuffer = Buffer.from(providedToken);
        if (secretBuffer.length === providedBuffer.length) {
          isAuthenticated = timingSafeEqual(secretBuffer, providedBuffer);
        }
      } catch {
        isAuthenticated = false;
      }
    }

    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use admin client for operations (now that we've verified auth)
    const supabase = getAdminClient();

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
      console.error('Error queueing tool:', queueError.code);
      return new Response(
        JSON.stringify({ error: 'Failed to queue tool' }),
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
