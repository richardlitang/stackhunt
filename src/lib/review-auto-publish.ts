import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';
import { refreshQualityGateSnapshotForItem } from '@/lib/quality-gate-snapshot';

interface SupabaseLike {
  from: (table: string) => any;
}

export interface AutoPublishResult {
  reviewId: string;
  published: boolean;
  reason?: string;
  blockers?: string[];
  itemId?: string;
}

export async function maybeAutoPublishReview(
  admin: SupabaseLike,
  reviewId: string
): Promise<AutoPublishResult> {
  const { data: reviewRow, error: reviewFetchError } = await admin
    .from('reviews')
    .select(
      `
      id,
      item_id,
      status,
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
    .eq('id', reviewId)
    .maybeSingle();

  if (reviewFetchError || !reviewRow) {
    return {
      reviewId,
      published: false,
      reason: `fetch_failed:${reviewFetchError?.message || 'missing_review'}`,
    };
  }

  if (reviewRow.status === 'published') {
    return {
      reviewId,
      itemId: reviewRow.item_id || undefined,
      published: false,
      reason: 'already_published',
    };
  }

  if (!reviewRow.item) {
    return {
      reviewId,
      itemId: reviewRow.item_id || undefined,
      published: false,
      reason: 'missing_item_metadata',
    };
  }

  const gate = evaluateStrictPublishGate(reviewRow.item as any, reviewRow as any);
  if (!gate.pass) {
    return {
      reviewId,
      itemId: reviewRow.item_id || undefined,
      published: false,
      reason: 'strict_gate_blocked',
      blockers: gate.blockers,
    };
  }

  const now = new Date().toISOString();
  const { data: publishedRow, error: publishError } = await admin
    .from('reviews')
    .update({
      status: 'published',
      published_at: now,
      updated_at: now,
    })
    .eq('id', reviewId)
    .in('status', ['draft', 'review'])
    .select('id, item_id')
    .maybeSingle();

  if (publishError) {
    return {
      reviewId,
      itemId: reviewRow.item_id || undefined,
      published: false,
      reason: `publish_failed:${publishError.message}`,
    };
  }

  if (!publishedRow) {
    return {
      reviewId,
      itemId: reviewRow.item_id || undefined,
      published: false,
      reason: 'publish_race_or_status_changed',
    };
  }

  try {
    await refreshQualityGateSnapshotForItem(admin, publishedRow.item_id, publishedRow.id);
  } catch (snapshotError) {
    return {
      reviewId,
      itemId: publishedRow.item_id,
      published: true,
      reason: `published_but_snapshot_failed:${
        snapshotError instanceof Error ? snapshotError.message : 'unknown'
      }`,
    };
  }

  return {
    reviewId,
    itemId: publishedRow.item_id,
    published: true,
  };
}
