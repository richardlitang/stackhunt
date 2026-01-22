/**
 * Admin API: Manually Verify Single Affiliate Link
 *
 * POST /api/admin/affiliate-links/[id]/verify
 *
 * @module api/admin/affiliate-links/verify
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY
);

const USER_AGENT = 'StackHunt-LinkVerifier/1.0 (manual check)';
const REQUEST_TIMEOUT_MS = 10000;

export const POST: APIRoute = async ({ params, cookies }) => {
  const { id } = params;

  // Auth check
  const sessionToken = cookies.get('admin_session')?.value;
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify admin session
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('token_hash', sessionToken)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch the affiliate offer
  const { data: offer, error: fetchError } = await supabase
    .from('affiliate_offers')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !offer) {
    return new Response(JSON.stringify({ error: 'Offer not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Perform HEAD request to verify link
  let verificationStatus: 'healthy' | 'broken' | 'expired' | 'unknown' = 'unknown';
  let statusCode: number | null = null;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(offer.url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    statusCode = response.status;

    if (response.ok) {
      verificationStatus = 'healthy';
    } else if (response.status === 404 || response.status === 410) {
      verificationStatus = 'broken';
    } else if (response.status >= 500) {
      verificationStatus = 'unknown';
    } else {
      verificationStatus = 'broken';
    }
  } catch (error: any) {
    errorMessage = error.message || 'Network error';
    verificationStatus = 'unknown';
  }

  // Update database
  const { error: updateError } = await supabase
    .from('affiliate_offers')
    .update({
      verification_status: verificationStatus,
      last_verified_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      verification: {
        status: verificationStatus,
        statusCode,
        error: errorMessage,
        verified_at: new Date().toISOString(),
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
