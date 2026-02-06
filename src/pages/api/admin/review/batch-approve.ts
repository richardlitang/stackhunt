/**
 * Batch Approve High Confidence Reviews
 * POST /api/admin/review/batch-approve
 *
 * Approves all reviews where tool.knowledge_card.meta.data_quality = 'high'
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';

export const prerender = false;

interface BatchApproveRequest {
  minConfidence?: 'high' | 'medium';
  ids?: string[]; // Optional: specific IDs to approve
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: BatchApproveRequest = await request.json().catch(() => ({}));
    const admin = getAdminClient();

    // If specific IDs provided, approve those
    if (body.ids && body.ids.length > 0) {
      const { data, error } = await admin
        .from('reviews')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .in('id', body.ids)
        .in('status', ['draft', 'review'])
        .select('id');

      if (error) {
        console.error('Batch approve error:', error);
        return ApiResponse.internalError('Failed to approve reviews');
      }

      return ApiResponse.ok({
        approved: data?.length || 0,
        message: `Approved ${data?.length || 0} reviews`,
      });
    }

    // Otherwise, approve by confidence level
    const minConfidence = body.minConfidence || 'high';

    // First, get all pending reviews with their tool's knowledge_card
    const { data: reviews, error: fetchError } = await admin
      .from('reviews')
      .select(
        `
        id,
        tool:tools(knowledge_card)
      `
      )
      .in('status', ['draft', 'review']);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return ApiResponse.internalError('Failed to fetch reviews');
    }

    // Filter by confidence
    const eligibleIds: string[] = [];
    for (const review of reviews || []) {
      const tool = review.tool as { knowledge_card?: { meta?: { data_quality?: string } } } | null;
      const quality = tool?.knowledge_card?.meta?.data_quality;

      if (minConfidence === 'high' && quality === 'high') {
        eligibleIds.push(review.id);
      } else if (minConfidence === 'medium' && (quality === 'high' || quality === 'medium')) {
        eligibleIds.push(review.id);
      }
    }

    if (eligibleIds.length === 0) {
      return ApiResponse.ok({
        approved: 0,
        message: 'No reviews meet the confidence threshold',
      });
    }

    // Approve eligible reviews
    const { data: approved, error: updateError } = await admin
      .from('reviews')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .in('id', eligibleIds)
      .select('id');

    if (updateError) {
      console.error('Update error:', updateError);
      return ApiResponse.internalError('Failed to approve reviews');
    }

    return ApiResponse.ok({
      approved: approved?.length || 0,
      message: `Approved ${approved?.length || 0} high-confidence reviews`,
    });
  } catch (error) {
    console.error('Batch approve error:', error);
    return ApiResponse.internalError('Batch approval failed');
  }
};
