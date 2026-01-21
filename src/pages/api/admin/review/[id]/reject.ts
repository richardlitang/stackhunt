/**
 * Reject Review
 * POST /api/admin/review/[id]/reject
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    return ApiResponse.badRequest('Review ID required');
  }

  try {
    // Optional: get rejection reason from body
    let reason: string | null = null;
    try {
      const body = await request.json();
      reason = body.reason || null;
    } catch {
      // No body provided, that's fine
    }

    const admin = getAdminClient();

    const updateData: Record<string, unknown> = {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.reviewer_notes = reason;
    }

    const { data, error } = await admin
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      console.error('Reject error:', error);
      return ApiResponse.internalError('Failed to reject review');
    }

    return ApiResponse.ok({
      id: data.id,
      status: data.status,
      message: 'Review rejected',
    });
  } catch (error) {
    console.error('Reject error:', error);
    return ApiResponse.internalError('Reject failed');
  }
};
