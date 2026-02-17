/**
 * Publish Check for Review
 * GET /api/admin/review/[id]/publish-check
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) return ApiResponse.badRequest('Review ID required');

  try {
    const admin = getAdminClient();

    const { data: reviewRow, error } = await admin
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

    if (error || !reviewRow?.item_id || !reviewRow?.item) {
      return ApiResponse.notFound('Review not found for publish checks');
    }

    const gate = evaluateStrictPublishGate(
      reviewRow.item as any,
      {
        summary_markdown: reviewRow.summary_markdown,
        cons: reviewRow.cons,
        sources: reviewRow.sources,
      } as any
    );

    return ApiResponse.ok({
      pass: gate.pass,
      blockers: gate.blockers,
      evidenceGrade: gate.evidenceGrade,
      metrics: gate.metrics,
    });
  } catch (err) {
    console.error('Publish check error:', err);
    return ApiResponse.internalError('Failed to run publish checks');
  }
};
