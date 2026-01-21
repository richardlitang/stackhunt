/**
 * Admin API: Delete from Queue
 * POST /api/admin/queue/[id]/delete
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

    const { error } = await admin.from('content_queue').delete().eq('id', id);

    if (error) {
      console.error('Queue delete error:', error);
      return new Response(`Delete failed: ${error.message}`, { status: 500 });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/queue' },
    });
  } catch (error) {
    console.error('Admin queue delete error:', error);
    return new Response('Internal error', { status: 500 });
  }
};
