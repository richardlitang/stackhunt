/**
 * Accept Correction API - POST /api/admin/corrections/[id]/accept
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing correction ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const admin = getAdminClient();

    const { error } = await admin
      .from('corrections')
      .update({
        status: 'accepted',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Accept correction error:', error);
      return new Response(JSON.stringify({ error: 'Failed to accept correction' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Accept correction API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
