/**
 * Admin API: Update Review
 * POST /api/admin/review/[id]/update
 *
 * Handles save, publish, and reject actions
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { refreshQualityGateSnapshotForItem } from '@/lib/quality-gate-snapshot';
import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';

export const prerender = false;

interface StructuredClaim {
  text: string;
  source_url?: string;
  source_type?: string;
  claim_type?: string;
  retrieved_at?: string;
  claim_kind?: string;
  vendor_phrase?: string;
  comparison_basis_source_url?: string;
}

function normalizeClaimText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function claimText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { text?: unknown }).text === 'string'
  ) {
    return ((value as { text: string }).text || '').trim();
  }
  return '';
}

function preserveClaimAttribution(
  editedLines: string[],
  existingClaims: unknown
): Array<string | StructuredClaim> {
  const existing = Array.isArray(existingClaims) ? existingClaims : [];
  const byText = new Map<string, unknown>();

  for (const claim of existing) {
    const text = claimText(claim);
    if (!text) continue;
    const key = normalizeClaimText(text);
    if (!byText.has(key)) byText.set(key, claim);
  }

  return editedLines.map((line) => {
    const key = normalizeClaimText(line);
    const existingClaim = byText.get(key);
    if (
      existingClaim &&
      typeof existingClaim === 'object' &&
      typeof (existingClaim as { text?: unknown }).text === 'string'
    ) {
      return {
        ...(existingClaim as StructuredClaim),
        text: line.trim(),
      };
    }
    return line.trim();
  });
}

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
    const faqJsonRaw = (formData.get('faq_json') as string) || '[]';

    // Parse arrays
    const prosLines = prosRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const consLines = consRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const sentimentTags = tagsRaw
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean);

    let parsedFaqs: unknown[] = [];
    try {
      const parsed = JSON.parse(faqJsonRaw || '[]');
      if (!Array.isArray(parsed)) {
        return new Response('FAQ JSON must be an array', { status: 400 });
      }
      parsedFaqs = parsed;
    } catch {
      return new Response('FAQ JSON is invalid', { status: 400 });
    }

    const { data: existingReview, error: existingReviewError } = await admin
      .from('reviews')
      .select('item_id, pros, cons, sources')
      .eq('id', id)
      .maybeSingle();
    if (existingReviewError || !existingReview?.item_id) {
      return new Response('Failed to resolve review metadata for update', { status: 500 });
    }

    const pros = preserveClaimAttribution(prosLines, existingReview.pros);
    const cons = preserveClaimAttribution(consLines, existingReview.cons);

    const { data: itemRow, error: itemFetchError } = await admin
      .from('items')
      .select('id, metadata, specs, pricing_confidence, pricing_verified_at, short_description, verdict, updated_at')
      .eq('id', existingReview.item_id)
      .maybeSingle();
    if (itemFetchError || !itemRow) {
      return new Response('Failed to load item metadata for publish safety checks', { status: 500 });
    }

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
      const gate = evaluateStrictPublishGate(itemRow as any, {
        summary_markdown: summaryMarkdown,
        cons,
        sources: existingReview.sources,
      } as any);
      if (!gate.pass) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Publish blocked by strict safety gate',
            blockers: gate.blockers,
            evidenceGrade: gate.evidenceGrade,
            metrics: gate.metrics,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
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

    // Persist FAQ edits to the associated tool metadata
    const { data: toolRow, error: toolFetchError } = await admin
      .from('tools')
      .select('id, metadata')
      .eq('id', existingReview.item_id)
      .single();
    if (toolFetchError || !toolRow) {
      return new Response('Failed to load tool metadata for FAQ update', { status: 500 });
    }

    const nextMetadata = {
      ...((toolRow.metadata as Record<string, unknown> | null) || {}),
      faqs: parsedFaqs,
    };
    const { error: toolUpdateError } = await admin
      .from('tools')
      .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
      .eq('id', toolRow.id);
    if (toolUpdateError) {
      return new Response(`FAQ update failed: ${toolUpdateError.message}`, { status: 500 });
    }

    await refreshQualityGateSnapshotForItem(admin as any, existingReview.item_id, id);

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
