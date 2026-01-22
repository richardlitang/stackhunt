/**
 * Admin API: List Content Ideas
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  // Verify admin session
  const sessionToken = cookies.get('stackhunt_admin_session')?.value;
  if (!sessionToken) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const sessionValidation = await validateSession(sessionToken);
  if (!sessionValidation.valid) {
    return new Response(
      JSON.stringify({ error: 'Invalid session' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const status = url.searchParams.get('status');

    let query = supabase
      .from('content_ideas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch content ideas:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ideas: data || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch ideas' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
