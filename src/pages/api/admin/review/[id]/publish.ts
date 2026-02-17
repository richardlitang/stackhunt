/**
 * Publish Review
 * POST /api/admin/review/[id]/publish
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { refreshQualityGateSnapshotForItem } from '@/lib/quality-gate-snapshot';
import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return ApiResponse.badRequest('Review ID required');
  }

  try {
    const admin = getAdminClient();

    const { data: reviewRow, error: reviewFetchError } = await admin
      .from('reviews')
      .select(
        `
        id,
        item_id,
        summary_markdown,
        cons,
        sources,
        item:items(
          id,
          metadata,
          specs,
          pricing_confidence,
          pricing_verified_at,
          short_description,
          verdict,
          updated_at
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (reviewFetchError || !reviewRow?.item_id || !reviewRow?.item) {
      return ApiResponse.internalError('Failed to load review for publish checks');
    }

    const gate = evaluateStrictPublishGate(reviewRow.item as any, {
      summary_markdown: reviewRow.summary_markdown,
      cons: reviewRow.cons,
      sources: reviewRow.sources,
    } as any);

    if (!gate.pass) {
      return ApiResponse.badRequest('Publish blocked by strict safety gate', {
        blockers: gate.blockers,
        evidenceGrade: gate.evidenceGrade,
        metrics: gate.metrics,
      });
    }

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
