import { normalizeComparePair } from '@/lib/compiler/snapshot-helpers';
import { getAdminClient } from '@/lib/supabase';

type PublishCompareResult = {
  pair: string;
  snapshotId: string;
  version: number;
  publishedAt: string;
};

function gatePassFromSnapshot(snapshotJson: unknown): boolean {
  if (!snapshotJson || typeof snapshotJson !== 'object') return false;
  const gate = (snapshotJson as Record<string, unknown>).publish_gate;
  if (!gate || typeof gate !== 'object') return false;
  return Boolean((gate as Record<string, unknown>).pass);
}

export async function publishCompareSnapshot(
  rawSlugA: string,
  rawSlugB: string,
  rawSpecKey?: string | null
): Promise<PublishCompareResult> {
  const admin = getAdminClient();
  const { toolASlug, toolBSlug } = normalizeComparePair(rawSlugA, rawSlugB);
  const specKey =
    typeof rawSpecKey === 'string' && rawSpecKey.trim().length > 0 ? rawSpecKey.trim() : null;

  const baseQuery = admin
    .from('compare_snapshots')
    .select('id, version, snapshot_json')
    .eq('tool_a_slug', toolASlug)
    .eq('tool_b_slug', toolBSlug)
    .eq('status', 'draft')
    .order('computed_at', { ascending: false })
    .limit(1);

  const { data: draftRows, error: draftError } = specKey
    ? await baseQuery.eq('spec_key', specKey)
    : await baseQuery.is('spec_key', null);

  if (draftError) {
    throw new Error(
      `Failed to load compare draft snapshot for "${toolASlug}-vs-${toolBSlug}": ${draftError.message}`
    );
  }

  const draft = draftRows?.[0] as
    | { id: string; version: number; snapshot_json: unknown }
    | undefined;
  if (!draft) {
    throw new Error(`No draft snapshot found for pair "${toolASlug}-vs-${toolBSlug}"`);
  }

  if (!gatePassFromSnapshot(draft.snapshot_json)) {
    throw new Error(`Draft snapshot gate failed for pair "${toolASlug}-vs-${toolBSlug}"`);
  }

  const publishedAt = new Date().toISOString();
  const demoteBaseQuery = admin
    .from('compare_snapshots')
    .update({
      status: 'draft',
      published_at: null,
      updated_at: publishedAt,
    })
    .eq('tool_a_slug', toolASlug)
    .eq('tool_b_slug', toolBSlug)
    .eq('status', 'published')
    .neq('id', draft.id);
  const { error: demoteError } = specKey
    ? await demoteBaseQuery.eq('spec_key', specKey)
    : await demoteBaseQuery.is('spec_key', null);

  if (demoteError) {
    throw new Error(
      `Failed to demote previous published compare snapshots for "${toolASlug}-vs-${toolBSlug}": ${demoteError.message}`
    );
  }

  const { error: updateError } = await admin
    .from('compare_snapshots')
    .update({
      status: 'published',
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq('id', draft.id);

  if (updateError) {
    throw new Error(
      `Failed to publish compare snapshot for "${toolASlug}-vs-${toolBSlug}": ${updateError.message}`
    );
  }

  return {
    pair: `${toolASlug}-vs-${toolBSlug}`,
    snapshotId: draft.id,
    version: draft.version,
    publishedAt,
  };
}
