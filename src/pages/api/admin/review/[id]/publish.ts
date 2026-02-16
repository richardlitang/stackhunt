/**
 * Publish Review
 * POST /api/admin/review/[id]/publish
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { refreshQualityGateSnapshotForItem } from '@/lib/quality-gate-snapshot';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return ApiResponse.badRequest('Review ID required');
  }

  try {
    const admin = getAdminClient();

    const { data, error } = await admin
      .from('reviews')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status, item_id')
      .single();

    if (error) {
      console.error('Publish error:', error);
      return ApiResponse.internalError('Failed to publish review');
    }

    await refreshQualityGateSnapshotForItem(admin as any, data.item_id, data.id);

    return ApiResponse.ok({
      id: data.id,
      status: data.status,
      message: 'Review published',
    });
  } catch (error) {
    console.error('Publish error:', error);
    return ApiResponse.internalError('Publish failed');
  }
};
