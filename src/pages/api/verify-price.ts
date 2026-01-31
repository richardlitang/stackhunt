/**
 * API Endpoint: POST /api/verify-price
 *
 * Records community price verification votes.
 * When users report inaccurate pricing, automatically queues the tool for re-research.
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { toolId, toolName, accurate } = await request.json();

    if (!toolId || typeof accurate !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP for deduplication (hash it for privacy)
    const clientIp = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')
      || 'unknown';

    const ipHash = clientIp !== 'unknown'
      ? await hashString(clientIp)
      : null;

    // Record the verification
    const { error: insertError } = await supabase
      .from('price_verifications')
      .insert({
        item_id: toolId,
        is_accurate: accurate,
        ip_hash: ipHash,
      });

    if (insertError) {
      console.error('Error recording price verification:', insertError);
      // Don't fail the request if logging fails
    }

    // If inaccurate, queue for re-hunt with high priority
    if (!accurate) {
      const { error: queueError } = await supabase
        .from('hunt_queue')
        .insert({
          item_id: toolId,
          item_name: toolName,
          priority: 8, // High priority for user-reported issues
          source: 'user_request',
          hunt_type: 'refresh',
          metadata: {
            reason: 'user_reported_pricing_change',
            reported_at: new Date().toISOString(),
          },
        });

      if (queueError) {
        console.error('Error queuing tool for re-hunt:', queueError);
      }
    } else {
      // If accurate, update verification timestamp and counter
      const { error: updateError } = await supabase
        .from('items')
        .update({
          last_user_verified_at: new Date().toISOString(),
        })
        .eq('id', toolId);

      if (updateError) {
        console.error('Error updating verification timestamp:', updateError);
      }

      // Increment weekly counter (using SQL for atomic operation)
      await supabase.rpc('increment_weekly_verifications', { p_item_id: toolId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: accurate
          ? 'Thank you for verifying!'
          : 'Thanks for reporting! We\'ll verify this within 24 hours.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-price API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Simple hash function for IP addresses (privacy-preserving)
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
