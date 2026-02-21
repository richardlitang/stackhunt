import { getAdminClient } from '@/lib/supabase';
import { resolveCompilerPolicyVersion } from '@/lib/compiler/policy-version';
import { toClaimList, toEvidenceRefs } from '@/lib/compiler/snapshot-helpers';
import { evaluateBestPublishGate, resolveBestPublishThresholds } from '@/lib/compiler/best/publish-gate';
import {
  evaluateFactPackReadiness,
  resolveFactPackReadinessThresholds,
} from '@/lib/compiler/fact-pack-readiness';

type CompileBestOptions = {
  policyVersion?: string | null;
  specVersion?: string | null;
};

function resolveBestCompilerReviewStatuses(): Array<'published' | 'draft'> {
  const raw = String(process.env.BEST_COMPILER_REVIEW_STATUSES || '')
    .trim()
    .toLowerCase();
  if (!raw) return ['published'];

  const allowed = new Set(['published', 'draft']);
  const parsed = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is 'published' | 'draft' => allowed.has(entry));

  return parsed.length > 0 ? Array.from(new Set(parsed)) : ['published'];
}

function parseDateValue(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

export async function compileBestSnapshotDraft(contextSlug: string, options: CompileBestOptions = {}) {
  const admin = getAdminClient();
  const factPackThresholds = resolveFactPackReadinessThresholds();
  const factPackProfile = String(process.env.FACT_PACK_READINESS_PROFILE || 'default');
  const bestPublishThresholds = resolveBestPublishThresholds();
  const bestPublishProfile = String(process.env.BEST_PUBLISH_PROFILE || 'default');
  const reviewStatuses = resolveBestCompilerReviewStatuses();
  const slug = String(contextSlug || '').trim().toLowerCase();
  if (!slug) {
    throw new Error('Context slug is required');
  }

  const { data: context, error: contextError } = await admin
    .from('contexts')
    .select('id, slug, title, category_id')
    .eq('slug', slug)
    .maybeSingle();

  if (contextError) {
    throw new Error(`Failed to load context "${slug}": ${contextError.message}`);
  }
  if (!context) {
    throw new Error(`Context not found for slug "${slug}"`);
  }

  const { data: reviews, error: reviewsError } = await admin
    .from('reviews')
    .select(
      `
      id,
      item_id,
      score,
      summary_markdown,
      pros,
      cons,
      sources,
      quality,
      created_at,
      updated_at,
      item:items(id, slug, name)
    `
    )
    .eq('context_id', context.id)
    .in('status', reviewStatuses)
    .order('score', { ascending: false, nullsFirst: false })
    .limit(50);

  if (reviewsError) {
    throw new Error(`Failed to load reviews for "${slug}": ${reviewsError.message}`);
  }

  const candidateRows = (reviews || []).filter((review: any) => review?.item_id && review?.item?.slug);
  const candidateItemIds = Array.from(
    new Set(candidateRows.map((review: any) => String(review.item_id)).filter(Boolean))
  );
  const factPacksByItem = new Map<
    string,
    { quality_json: Record<string, unknown> | null; checked_at: string | null }
  >();

  if (candidateItemIds.length > 0) {
    const { data: factPacks, error: factPackError } = await admin
      .from('item_fact_packs')
      .select('item_id, quality_json, checked_at')
      .in('item_id', candidateItemIds)
      .order('checked_at', { ascending: false })
      .limit(candidateItemIds.length * 6);

    if (factPackError) {
      throw new Error(`Failed to load fact packs for "${slug}": ${factPackError.message}`);
    }

    for (const row of factPacks || []) {
      const itemId = String((row as any).item_id || '');
      if (!itemId || factPacksByItem.has(itemId)) continue;
      factPacksByItem.set(itemId, {
        quality_json:
          (row as any).quality_json && typeof (row as any).quality_json === 'object'
            ? ((row as any).quality_json as Record<string, unknown>)
            : null,
        checked_at: typeof (row as any).checked_at === 'string' ? (row as any).checked_at : null,
      });
    }
  }

  const excludedByReadiness: Array<{ item_slug: string; reasons: string[] }> = [];
  const eligibleRows = candidateRows.filter((review: any) => {
    const itemId = String(review.item_id);
    const factPack = factPacksByItem.get(itemId);
    if (!factPack) {
      excludedByReadiness.push({ item_slug: review.item.slug, reasons: ['fact_pack_missing'] });
      return false;
    }
    const readiness = evaluateFactPackReadiness(
      factPack.quality_json,
      factPackThresholds
    );
    if (!readiness.eligible) {
      excludedByReadiness.push({ item_slug: review.item.slug, reasons: readiness.reasons });
      return false;
    }
    return true;
  });

  const ranked = eligibleRows
    .filter((review: any) => review?.item_id && review?.item?.slug)
    .map((review: any, index: number) => {
      const evidenceRefs = toEvidenceRefs(review.sources, 3);
      return {
        rank: index + 1,
        item_id: review.item_id,
        tool_id: review.item_id, // compatibility for parity tooling
        slug: review.item.slug,
        name: review.item.name,
        score: Number(review.score || 0),
        quality: typeof review.quality === 'string' ? review.quality : null,
        reasons:
          typeof review.summary_markdown === 'string' && review.summary_markdown.trim().length > 0
            ? [review.summary_markdown.trim().slice(0, 220)]
            : [],
        pros: toClaimList(review.pros, 4),
        cons: toClaimList(review.cons, 4),
        evidence_refs: evidenceRefs,
      };
    });

  const allEvidenceRefs = ranked.flatMap((entry) => entry.evidence_refs);
  const uniqueEvidenceUrls = new Set(allEvidenceRefs.map((ref) => ref.url));
  const lastCheckedTs = Math.max(
    0,
    ...((reviews || []) as any[]).map((review) =>
      Math.max(parseDateValue(review.updated_at), parseDateValue(review.created_at))
    )
  );

  const snapshotJson = {
    context: {
      id: context.id,
      slug: context.slug,
      title: context.title,
      category_id: context.category_id,
    },
    ranked,
    metrics: {
      ranked_count: ranked.length,
      sources_count: uniqueEvidenceUrls.size,
      last_checked_rollup: lastCheckedTs > 0 ? new Date(lastCheckedTs).toISOString() : null,
      coverage_rollup: ranked.length > 0 ? 1 : 0,
      fact_pack_excluded_count: excludedByReadiness.length,
    },
    meta: {
      compiler: 'shadow-v0',
      compile_mode: 'draft_only',
      generated_at: new Date().toISOString(),
      fact_pack_profile: factPackProfile,
      fact_pack_thresholds: factPackThresholds,
      best_publish_profile: bestPublishProfile,
      best_publish_thresholds: bestPublishThresholds,
      review_statuses: reviewStatuses,
      fact_pack_excluded: excludedByReadiness,
    },
  };

  const topK = ranked.slice(0, 5);
  const publishGate = evaluateBestPublishGate({
    rankedCount: ranked.length,
    topKCount: topK.length,
    topKWithEvidenceCount: topK.filter((entry) => entry.evidence_refs.length > 0).length,
    topKFreshCount: topK.length, // v0 assumes review freshness already screened upstream
    criticalConflictCount: 0,
  }, bestPublishThresholds);

  (snapshotJson as any).publish_gate = publishGate;

  const { data: latestVersionRows, error: versionError } = await admin
    .from('best_snapshots')
    .select('version')
    .eq('context_slug', slug)
    .order('version', { ascending: false })
    .limit(1);

  if (versionError) {
    throw new Error(`Failed to resolve snapshot version for "${slug}": ${versionError.message}`);
  }

  const nextVersion = ((latestVersionRows?.[0] as { version?: number } | undefined)?.version || 0) + 1;

  const { data: insertedRows, error: insertError } = await admin
    .from('best_snapshots')
    .insert({
      context_slug: slug,
      version: nextVersion,
      policy_version: resolveCompilerPolicyVersion(options.policyVersion),
      spec_version: options.specVersion || null,
      snapshot_json: snapshotJson,
      status: 'draft',
      computed_at: new Date().toISOString(),
      published_at: null,
    })
    .select('id, version, status, computed_at')
    .limit(1);

  if (insertError) {
    throw new Error(`Failed to persist best snapshot for "${slug}": ${insertError.message}`);
  }

  return {
    contextSlug: slug,
    snapshotId: (insertedRows?.[0] as any)?.id as string,
    version: (insertedRows?.[0] as any)?.version as number,
    status: (insertedRows?.[0] as any)?.status as string,
    rankedCount: ranked.length,
    sourceCount: uniqueEvidenceUrls.size,
    publishGatePass: publishGate.pass,
  };
}
