/**
 * API: Strategy Approve Single
 * POST /api/admin/strategy/approve-single
 *
 * Approves a single content idea and adds it to the hunt queue.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const admin = getAdminClient();
    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call approve function
    const { data, error } = await admin.rpc('approve_content_idea', {
      p_idea_id: id,
    });

    if (error) {
      console.error('Approval failed:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Approval failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Redirect back to strategy page
    return redirect('/admin/strategy');
  } catch (err) {
    console.error('Approve single error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Approval failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
