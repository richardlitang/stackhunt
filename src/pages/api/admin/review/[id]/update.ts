/**
 * Admin API: Update Review
 * POST /api/admin/review/[id]/update
 *
 * Handles save, publish, and reject actions
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    return new Response('Missing review ID', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;

    const admin = getAdminClient();

    // Parse form data
    const score = parseInt(formData.get('score') as string) || 0;
    const summaryMarkdown = formData.get('summary_markdown') as string;
    const prosRaw = formData.get('pros') as string;
    const consRaw = formData.get('cons') as string;
    const tagsRaw = formData.get('sentiment_tags') as string;
    const reviewerNotes = formData.get('reviewer_notes') as string;

    // Parse arrays
    const pros = prosRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const cons = consRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const sentimentTags = tagsRaw
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean);

    // Base update
    const updateData: Record<string, unknown> = {
      score,
      summary_markdown: summaryMarkdown,
      pros,
      cons,
      sentiment_tags: sentimentTags,
      reviewer_notes: reviewerNotes,
      updated_at: new Date().toISOString(),
    };

    // Handle action
    if (action === 'publish') {
      updateData.status = 'published';
      updateData.published_at = new Date().toISOString();
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = reviewerNotes || 'Rejected by reviewer';
    }

    // Update
    const { error } = await admin.from('reviews').update(updateData).eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return new Response(`Update failed: ${error.message}`, { status: 500 });
    }

    // Redirect back to review list
    if (action === 'publish' || action === 'reject') {
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/review' },
      });
    }

    // Stay on page for save
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin/review/${id}?saved=true` },
    });
  } catch (error) {
    console.error('Admin update error:', error);
    return new Response('Internal error', { status: 500 });
  }
};
