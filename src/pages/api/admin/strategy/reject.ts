/**
 * API: Strategy Reject
 * POST /api/admin/strategy/reject
 *
 * Rejects a content idea (marks as rejected).
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const admin = getAdminClient();
    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update status to rejected
    const { error } = await admin
      .from('content_ideas')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Rejection failed:', error);
      return new Response(JSON.stringify({ success: false, error: 'Rejection failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect back to strategy page
    return redirect('/admin/strategy');
  } catch (err) {
    console.error('Reject error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Rejection failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
