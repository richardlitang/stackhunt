/**
 * Batch Approve High Confidence Reviews
 * POST /api/admin/review/batch-approve
 *
 * Approves all reviews where tool.knowledge_card.meta.data_quality = 'high'
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { refreshQualityGateSnapshotForItem } from '@/lib/quality-gate-snapshot';
import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';

export const prerender = false;

interface BatchApproveRequest {
  minConfidence?: 'high' | 'medium';
  ids?: string[]; // Optional: specific IDs to approve
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: BatchApproveRequest = await request.json().catch(() => ({}));
    const admin = getAdminClient();

    const selectFields = `
      id,
      item_id,
      status,
      score,
      quality,
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
    `;

    // If specific IDs provided, approve those
    if (body.ids && body.ids.length > 0) {
      const { data: candidates, error: fetchError } = await admin
        .from('reviews')
        .select(selectFields)
        .in('id', body.ids)
        .in('status', ['draft', 'review']);

      if (fetchError) {
        console.error('Batch approve fetch error:', fetchError);
        return ApiResponse.internalError('Failed to load reviews for strict gate');
      }

      const eligibleIds: string[] = [];
      const blocked: Array<{ id: string; blockers: string[] }> = [];
      for (const row of candidates || []) {
        if (!(row as any).item) {
          blocked.push({ id: row.id, blockers: ['strict:missing_item_metadata'] });
          continue;
        }
        const gate = evaluateStrictPublishGate((row as any).item, row as any);
        if (gate.pass) eligibleIds.push(row.id);
        else blocked.push({ id: row.id, blockers: gate.blockers });
      }

      if (eligibleIds.length === 0) {
        return ApiResponse.badRequest('No selected reviews passed the strict safety gate', { blocked });
      }

      const { data, error } = await admin
        .from('reviews')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .in('id', eligibleIds)
        .in('status', ['draft', 'review'])
        .select('id, item_id');

      if (error) {
        console.error('Batch approve update error:', error);
        return ApiResponse.internalError('Failed to approve reviews');
      }

      for (const review of data || []) {
        if (!review.item_id) continue;
        await refreshQualityGateSnapshotForItem(admin as any, review.item_id, review.id);
      }

      return ApiResponse.ok({
        approved: data?.length || 0,
        blocked: blocked.length,
        blockedDetails: blocked,
        message: `Approved ${data?.length || 0} reviews`,
      });
    }

    // Otherwise, approve by confidence level
    const minConfidence = body.minConfidence || 'high';

    // First, get all pending reviews with their tool's knowledge_card
    const { data: reviews, error: fetchError } = await admin
      .from('reviews')
      .select(selectFields)
      .in('status', ['draft', 'review']);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return ApiResponse.internalError('Failed to fetch reviews');
    }

    // Filter by confidence + strict publish gate
    const eligibleIds: string[] = [];
    const blocked: Array<{ id: string; blockers: string[] }> = [];
    for (const review of reviews || []) {
      const item = (review as any).item as
        | { metadata?: { meta?: { data_quality?: string } } }
        | null;
      if (!item) {
        blocked.push({ id: (review as any).id, blockers: ['strict:missing_item_metadata'] });
        continue;
      }
      const quality = item?.metadata?.meta?.data_quality;
      const gate = evaluateStrictPublishGate((review as any).item, review as any);

      if (!gate.pass) {
        blocked.push({ id: (review as any).id, blockers: gate.blockers });
        continue;
      }

      if (minConfidence === 'high' && quality === 'high') {
        eligibleIds.push(review.id);
      } else if (minConfidence === 'medium' && (quality === 'high' || quality === 'medium')) {
        eligibleIds.push(review.id);
      }
    }

    if (eligibleIds.length === 0) {
      return ApiResponse.ok({
        approved: 0,
        blocked: blocked.length,
        blockedDetails: blocked,
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
      .select('id, item_id');

    if (updateError) {
      console.error('Update error:', updateError);
      return ApiResponse.internalError('Failed to approve reviews');
    }

    for (const review of approved || []) {
      if (!review.item_id) continue;
      await refreshQualityGateSnapshotForItem(admin as any, review.item_id, review.id);
    }

    return ApiResponse.ok({
      approved: approved?.length || 0,
      blocked: blocked.length,
      blockedDetails: blocked,
      message: `Approved ${approved?.length || 0} high-confidence reviews`,
    });
  } catch (error) {
    console.error('Batch approve error:', error);
    return ApiResponse.internalError('Batch approval failed');
  }
};
