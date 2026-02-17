import { evaluateIndexReadiness } from '@/lib/quality-gate';

interface SnapshotDeps {
  from: (table: string) => any;
}

export async function refreshQualityGateSnapshotForItem(
  deps: SnapshotDeps,
  itemId: string,
  reviewId?: string | null
): Promise<void> {
  const { data: itemRow, error: itemError } = await deps
    .from('items')
    .select('id, metadata, specs, pricing_verified_at, short_description, verdict, updated_at')
    .eq('id', itemId)
    .single();

  if (itemError || !itemRow) {
    throw new Error(
      `Failed to load item for quality snapshot (${itemError?.message || 'missing'})`
    );
  }

  const reviewQuery = deps
    .from('reviews')
    .select('id, status, summary_markdown, pros, cons, sources, created_at, updated_at')
    .eq('item_id', itemId)
    .order('updated_at', { ascending: false })
    .limit(1);

  const { data: reviewRows, error: reviewError } = reviewId
    ? await reviewQuery.eq('id', reviewId)
    : await reviewQuery;

  if (reviewError) {
    throw new Error(`Failed to load review for quality snapshot (${reviewError.message})`);
  }

  const gateReview = (reviewRows && reviewRows.length > 0 ? reviewRows[0] : null) as any;
  const readiness = evaluateIndexReadiness(itemRow as any, gateReview);
  const isDraftLike = gateReview?.status !== 'published';
  const shouldIndex = readiness.shouldIndex && !isDraftLike;
  const noindexReasons = [...readiness.reasons];
  if (isDraftLike) noindexReasons.push('draft_review');

  const specs = (itemRow.specs as Record<string, unknown>) || {};
  const canonical = (specs.canonical as Record<string, unknown>) || {};
  const quality = {
    ...((canonical.quality as Record<string, unknown>) || {}),
    should_index: shouldIndex,
    noindex_reasons: noindexReasons,
    required_sections_complete: readiness.signals.required_sections_complete,
    volatiles_fresh: readiness.signals.volatiles_fresh,
    conflicts_count: readiness.signals.conflicts_count,
    score: readiness.signals.score,
    section_publishability: readiness.signals.section_publishability,
    section_status: readiness.signals.section_status,
    evidence_counts: readiness.signals.evidence_counts,
    last_evaluated_at: new Date().toISOString(),
  };

  const mergedSpecs = {
    ...specs,
    canonical: {
      ...canonical,
      quality,
    },
  };

  const { error: updateError } = await deps
    .from('items')
    .update({ specs: mergedSpecs })
    .eq('id', itemId);
  if (updateError) {
    throw new Error(`Failed to persist quality snapshot (${updateError.message})`);
  }
}
