/**
 * Inline Update Review Field
 * PATCH /api/admin/review/[id]/inline-update
 *
 * Updates a single field on a review (for inline editing)
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';

export const prerender = false;

interface InlineUpdateRequest {
  field: string;
  value: unknown;
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    return ApiResponse.badRequest('Review ID required');
  }

  try {
    const body: InlineUpdateRequest = await request.json();
    const { field, value } = body;

    if (!field) {
      return ApiResponse.badRequest('Field name required');
    }

    const admin = getAdminClient();

    // Handle nested knowledge_card updates
    if (field.startsWith('knowledge_card.')) {
      // Get current knowledge_card
      const { data: review, error: fetchError } = await admin
        .from('reviews')
        .select('tool:tools(id, knowledge_card)')
        .eq('id', id)
        .single();

      if (fetchError || !review) {
        return ApiResponse.notFound('Review not found');
      }

      const tool = review.tool as { id: string; knowledge_card?: Record<string, unknown> };
      const knowledgeCard = tool.knowledge_card || {};

      // Parse the nested path (e.g., 'knowledge_card.pricing.starting_price')
      const path = field.replace('knowledge_card.', '').split('.');
      let current: Record<string, unknown> = knowledgeCard;

      // Navigate to parent of the target field
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]] as Record<string, unknown>;
      }

      // Set the value
      current[path[path.length - 1]] = value;

      // Update the tool's knowledge_card
      const { error: updateError } = await admin
        .from('tools')
        .update({ knowledge_card: knowledgeCard })
        .eq('id', tool.id);

      if (updateError) {
        console.error('Knowledge card update error:', updateError);
        return ApiResponse.internalError('Failed to update knowledge card');
      }

      return ApiResponse.ok({ updated: field, value });
    }

    // Handle direct review field updates
    const allowedFields = ['score', 'pros', 'cons', 'summary_markdown', 'sentiment_tags', 'reviewer_notes'];

    if (!allowedFields.includes(field)) {
      return ApiResponse.badRequest(`Field '${field}' is not editable`);
    }

    const updateData: Record<string, unknown> = {
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from('reviews')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return ApiResponse.internalError('Failed to update review');
    }

    return ApiResponse.ok({ updated: field, value });
  } catch (error) {
    console.error('Inline update error:', error);
    return ApiResponse.internalError('Update failed');
  }
};
