import { getAdminClient } from '@/lib/supabase';
import { resolveCompilerPolicyVersion } from '@/lib/compiler/policy-version';
import { toClaimList, toEvidenceRefs } from '@/lib/compiler/snapshot-helpers';
import { evaluateBestPublishGate } from '@/lib/compiler/best/publish-gate';

type CompileBestOptions = {
  policyVersion?: string | null;
  specVersion?: string | null;
};

function parseDateValue(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

export async function compileBestSnapshotDraft(contextSlug: string, options: CompileBestOptions = {}) {
  const admin = getAdminClient();
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
    .eq('status', 'published')
    .order('score', { ascending: false, nullsFirst: false })
    .limit(50);

  if (reviewsError) {
    throw new Error(`Failed to load reviews for "${slug}": ${reviewsError.message}`);
  }

  const ranked = (reviews || [])
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
    },
    meta: {
      compiler: 'shadow-v0',
      compile_mode: 'draft_only',
      generated_at: new Date().toISOString(),
    },
  };

  const topK = ranked.slice(0, 5);
  const publishGate = evaluateBestPublishGate({
    rankedCount: ranked.length,
    topKCount: topK.length,
    topKWithEvidenceCount: topK.filter((entry) => entry.evidence_refs.length > 0).length,
    topKFreshCount: topK.length, // v0 assumes review freshness already screened upstream
    criticalConflictCount: 0,
  });

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
