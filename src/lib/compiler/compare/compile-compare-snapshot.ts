import { areToolsComparable } from '@/lib/analysis/comparator';
import { resolveCompilerPolicyVersion } from '@/lib/compiler/policy-version';
import { normalizeComparePair, toClaimList, toEvidenceRefs } from '@/lib/compiler/snapshot-helpers';
import { evaluateComparePublishGate } from '@/lib/compiler/compare/publish-gate';
import { getAdminClient } from '@/lib/supabase';
import {
  type FactPackReadinessResult,
  evaluateFactPackReadiness,
  resolveFactPackReadinessThresholds,
} from '@/lib/compiler/fact-pack-readiness';

type CompileCompareOptions = {
  policyVersion?: string | null;
  specKey?: string | null;
  specVersion?: string | null;
};

function averageScore(rows: Array<{ score: number | null | undefined }>): number {
  const scores = rows
    .map((row) => Number(row.score ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1));
}

export async function compileCompareSnapshotDraft(
  rawSlugA: string,
  rawSlugB: string,
  options: CompileCompareOptions = {}
) {
  const admin = getAdminClient();
  const factPackThresholds = resolveFactPackReadinessThresholds();
  const factPackProfile = String(process.env.FACT_PACK_READINESS_PROFILE || 'default');
  const { toolASlug, toolBSlug } = normalizeComparePair(rawSlugA, rawSlugB);

  const { data: items, error: itemsError } = await admin
    .from('items')
    .select(
      `
      id,
      slug,
      name,
      avg_score,
      pricing_type,
      pricing_confidence,
      learning_curve,
      data_confidence,
      metadata,
      item_category_links(
        relevance_score,
        category:categories(id, slug, name)
      ),
      reviews(
        score,
        pros,
        cons,
        sources
      )
    `
    )
    .in('slug', [toolASlug, toolBSlug])
    .limit(2)
    .limit(80, { foreignTable: 'reviews' });

  if (itemsError) {
    throw new Error(
      `Failed to load compare candidates "${toolASlug}" and "${toolBSlug}": ${itemsError.message}`
    );
  }
  if (!items || items.length !== 2) {
    throw new Error(`Unable to compile compare snapshot: missing item for "${toolASlug}-vs-${toolBSlug}"`);
  }

  const getPrimaryCategory = (item: any) =>
    (item?.item_category_links || [])
      .slice()
      .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))[0]?.category || null;

  const toolA = items.find((item: any) => item.slug === toolASlug);
  const toolB = items.find((item: any) => item.slug === toolBSlug);
  if (!toolA || !toolB) {
    throw new Error(`Unable to resolve ordered compare pair for "${toolASlug}-vs-${toolBSlug}"`);
  }

  const { data: factPacks, error: factPackError } = await admin
    .from('item_fact_packs')
    .select('item_id, quality_json, checked_at')
    .in('item_id', [toolA.id, toolB.id])
    .order('checked_at', { ascending: false })
    .limit(12);
  if (factPackError) {
    throw new Error(
      `Failed to load fact packs for "${toolASlug}-vs-${toolBSlug}": ${factPackError.message}`
    );
  }

  const latestFactPackByItem = new Map<string, { quality_json: Record<string, unknown> | null }>();
  for (const row of factPacks || []) {
    const itemId = String((row as any).item_id || '');
    if (!itemId || latestFactPackByItem.has(itemId)) continue;
    latestFactPackByItem.set(itemId, {
      quality_json:
        (row as any).quality_json && typeof (row as any).quality_json === 'object'
          ? ((row as any).quality_json as Record<string, unknown>)
          : null,
    });
  }

  const toolAFactPack = latestFactPackByItem.get(toolA.id);
  const toolBFactPack = latestFactPackByItem.get(toolB.id);
  const toolAReadiness: FactPackReadinessResult = toolAFactPack
    ? evaluateFactPackReadiness(toolAFactPack.quality_json, factPackThresholds)
    : {
        eligible: false,
        reasons: ['fact_pack_missing'],
        coverageRatio: 0,
        requiredCoverageRatio: 0,
        pricingAgeDays: null,
      };
  const toolBReadiness: FactPackReadinessResult = toolBFactPack
    ? evaluateFactPackReadiness(toolBFactPack.quality_json, factPackThresholds)
    : {
        eligible: false,
        reasons: ['fact_pack_missing'],
        coverageRatio: 0,
        requiredCoverageRatio: 0,
        pricingAgeDays: null,
      };
  if (!toolAReadiness.eligible || !toolBReadiness.eligible) {
    throw new Error(
      `Fact pack readiness failed: ${toolA.slug}=[${toolAReadiness.reasons.join(',')}], ${toolB.slug}=[${toolBReadiness.reasons.join(',')}]`
    );
  }

  const categoryA = getPrimaryCategory(toolA);
  const categoryB = getPrimaryCategory(toolB);
  const comparable = areToolsComparable(
    { slug: toolA.slug, category_id: categoryA?.id || null, metadata: toolA.metadata as any },
    { slug: toolB.slug, category_id: categoryB?.id || null, metadata: toolB.metadata as any }
  );

  const reviewsA = Array.isArray(toolA.reviews) ? toolA.reviews : [];
  const reviewsB = Array.isArray(toolB.reviews) ? toolB.reviews : [];
  const derivedScoreA = toolA.avg_score || averageScore(reviewsA);
  const derivedScoreB = toolB.avg_score || averageScore(reviewsB);

  const delta = Number((derivedScoreA - derivedScoreB).toFixed(1));
  const winner =
    Math.abs(delta) < 1.5 ? 'depends' : delta > 0 ? toolA.slug : toolB.slug;

  const sectionWinners = {
    overall: winner,
    pricing:
      toolA.pricing_confidence === toolB.pricing_confidence
        ? 'depends'
        : toolA.pricing_confidence === 'high'
          ? toolA.slug
          : toolB.pricing_confidence === 'high'
            ? toolB.slug
            : 'depends',
    confidence:
      (toolA.data_confidence || 0) === (toolB.data_confidence || 0)
        ? 'depends'
        : (toolA.data_confidence || 0) > (toolB.data_confidence || 0)
          ? toolA.slug
          : toolB.slug,
  };

  const snapshotJson = {
    pair: {
      tool_a_slug: toolASlug,
      tool_b_slug: toolBSlug,
      comparable,
      category_a: categoryA?.slug || null,
      category_b: categoryB?.slug || null,
    },
    verdict: {
      winner,
      score_delta: delta,
      rationale:
        winner === 'depends'
          ? 'Scores are close; decision depends on workflow fit and pricing details.'
          : `${winner} leads on aggregate score and confidence signals.`,
    },
    section_winners: sectionWinners,
    side_by_side: [
      {
        key: 'avg_score',
        label: 'Average score',
        a: derivedScoreA,
        b: derivedScoreB,
      },
      {
        key: 'pricing_type',
        label: 'Pricing model',
        a: toolA.pricing_type || null,
        b: toolB.pricing_type || null,
      },
      {
        key: 'pricing_confidence',
        label: 'Pricing confidence',
        a: toolA.pricing_confidence || null,
        b: toolB.pricing_confidence || null,
      },
      {
        key: 'learning_curve',
        label: 'Learning curve',
        a: toolA.learning_curve || null,
        b: toolB.learning_curve || null,
      },
    ],
    tool_summaries: {
      [toolA.slug]: {
        pros: toClaimList(reviewsA.flatMap((review: any) => review.pros || []), 4),
        cons: toClaimList(reviewsA.flatMap((review: any) => review.cons || []), 4),
      },
      [toolB.slug]: {
        pros: toClaimList(reviewsB.flatMap((review: any) => review.pros || []), 4),
        cons: toClaimList(reviewsB.flatMap((review: any) => review.cons || []), 4),
      },
    },
    citations: {
      [toolA.slug]: toEvidenceRefs(reviewsA.flatMap((review: any) => review.sources || []), 6),
      [toolB.slug]: toEvidenceRefs(reviewsB.flatMap((review: any) => review.sources || []), 6),
    },
    meta: {
      compiler: 'shadow-v0',
      compile_mode: 'draft_only',
      generated_at: new Date().toISOString(),
      fact_pack_profile: factPackProfile,
      fact_pack_thresholds: factPackThresholds,
      fact_pack_readiness: {
        [toolA.slug]: toolAReadiness,
        [toolB.slug]: toolBReadiness,
      },
    },
  };

  const publishGate = evaluateComparePublishGate({
    comparable,
    toolAHasEvidence: (snapshotJson.citations[toolA.slug] || []).length > 0,
    toolBHasEvidence: (snapshotJson.citations[toolB.slug] || []).length > 0,
    criticalConflictCount: 0,
  });
  (snapshotJson as any).publish_gate = publishGate;

  const specKey = typeof options.specKey === 'string' && options.specKey.trim() ? options.specKey.trim() : null;
  const latestVersionQuery = admin
    .from('compare_snapshots')
    .select('version')
    .eq('tool_a_slug', toolASlug)
    .eq('tool_b_slug', toolBSlug)
    .order('version', { ascending: false })
    .limit(1);
  const { data: versionRows, error: versionError } = specKey
    ? await latestVersionQuery.eq('spec_key', specKey)
    : await latestVersionQuery.is('spec_key', null);

  if (versionError) {
    throw new Error(
      `Failed to resolve compare snapshot version for "${toolASlug}-vs-${toolBSlug}": ${versionError.message}`
    );
  }

  const nextVersion = ((versionRows?.[0] as { version?: number } | undefined)?.version || 0) + 1;

  const { data: insertedRows, error: insertError } = await admin
    .from('compare_snapshots')
    .insert({
      category_id: categoryA?.id || categoryB?.id || null,
      schema_id: 'shadow.v0',
      tool_a_slug: toolASlug,
      tool_b_slug: toolBSlug,
      spec_key: specKey,
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
    throw new Error(
      `Failed to persist compare snapshot for "${toolASlug}-vs-${toolBSlug}": ${insertError.message}`
    );
  }

  return {
    pair: `${toolASlug}-vs-${toolBSlug}`,
    snapshotId: (insertedRows?.[0] as any)?.id as string,
    version: (insertedRows?.[0] as any)?.version as number,
    status: (insertedRows?.[0] as any)?.status as string,
    comparable,
    winner,
    publishGatePass: publishGate.pass,
  };
}
