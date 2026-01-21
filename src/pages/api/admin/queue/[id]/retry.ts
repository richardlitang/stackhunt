/**
 * Admin API: Retry Failed Queue Item
 * POST /api/admin/queue/[id]/retry
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response('Missing queue item ID', { status: 400 });
  }

  try {
    const admin = getAdminClient();

    // Reset to pending with cleared error
    const { error } = await admin
      .from('content_queue')
      .update({
        status: 'pending',
        last_error: null,
        attempts: 0,
      })
      .eq('id', id);

    if (error) {
      console.error('Queue retry error:', error);
      return new Response(`Retry failed: ${error.message}`, { status: 500 });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/queue' },
    });
  } catch (error) {
    console.error('Admin queue retry error:', error);
    return new Response('Internal error', { status: 500 });
  }
};
