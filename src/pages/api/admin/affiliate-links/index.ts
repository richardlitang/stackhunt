/**
 * Admin API: List Affiliate Links
 *
 * GET /api/admin/affiliate-links
 * Query params:
 *   - status: Filter by verification_status (healthy, broken, expired, pending, unknown)
 *   - tier: Filter by network_tier (1, 2, 3)
 *   - network: Filter by network name
 *
 * @module api/admin/affiliate-links
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY
);

export const GET: APIRoute = async ({ request, cookies }) => {
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

  // Parse query parameters
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  const tierFilter = url.searchParams.get('tier');
  const networkFilter = url.searchParams.get('network');

  // Build query
  let query = supabase
    .from('affiliate_offers')
    .select('*, tools(id, name, slug)')
    .order('last_verified_at', { ascending: true }); // Oldest verification first

  if (statusFilter) {
    query = query.eq('verification_status', statusFilter);
  }

  if (tierFilter) {
    query = query.eq('network_tier', parseInt(tierFilter));
  }

  if (networkFilter) {
    query = query.eq('network', networkFilter);
  }

  const { data: offers, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Calculate statistics
  const stats = {
    total: offers?.length || 0,
    healthy: offers?.filter((o) => o.verification_status === 'healthy').length || 0,
    broken: offers?.filter((o) => o.verification_status === 'broken').length || 0,
    unknown: offers?.filter((o) => o.verification_status === 'unknown').length || 0,
    pending: offers?.filter((o) => o.verification_status === 'pending').length || 0,
    never_verified: offers?.filter((o) => !o.last_verified_at).length || 0,
    by_tier: {
      tier_1: offers?.filter((o) => o.network_tier === 1).length || 0,
      tier_2: offers?.filter((o) => o.network_tier === 2).length || 0,
      tier_3: offers?.filter((o) => o.network_tier === 3).length || 0,
    },
  };

  return new Response(
    JSON.stringify({
      success: true,
      offers,
      stats,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
