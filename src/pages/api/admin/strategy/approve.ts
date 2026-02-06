/**
 * API: Strategy Bulk Approve
 * POST /api/admin/strategy/approve
 *
 * Auto-approves high ROI ideas and adds them to the hunt queue.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const admin = getAdminClient();
    const formData = await request.formData();
    const minRoi = parseFloat(formData.get('min_roi') as string) || 5.0;
    const limit = parseInt(formData.get('limit') as string) || 20;

    // Call bulk approve function
    const { data: _data, error } = await admin.rpc('bulk_approve_ideas', {
      p_min_roi: minRoi,
      p_limit: limit,
    });

    if (error) {
      console.error('Bulk approval failed:', error);
      return new Response(JSON.stringify({ success: false, error: 'Approval failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Redirect back to strategy page
    return redirect('/admin/strategy');
  } catch (err) {
    console.error('Approve error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Approval failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
