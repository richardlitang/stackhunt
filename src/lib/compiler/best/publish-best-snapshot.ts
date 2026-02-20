import { getAdminClient } from '@/lib/supabase';

type PublishBestResult = {
  contextSlug: string;
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

export async function publishBestSnapshot(contextSlug: string): Promise<PublishBestResult> {
  const admin = getAdminClient();
  const slug = String(contextSlug || '').trim().toLowerCase();
  if (!slug) throw new Error('Context slug is required');

  const { data: draftRows, error: draftError } = await admin
    .from('best_snapshots')
    .select('id, version, snapshot_json')
    .eq('context_slug', slug)
    .eq('status', 'draft')
    .order('computed_at', { ascending: false })
    .limit(1);

  if (draftError) {
    throw new Error(`Failed to load best draft snapshot for "${slug}": ${draftError.message}`);
  }

  const draft = draftRows?.[0] as
    | { id: string; version: number; snapshot_json: unknown }
    | undefined;
  if (!draft) {
    throw new Error(`No draft snapshot found for context "${slug}"`);
  }

  if (!gatePassFromSnapshot(draft.snapshot_json)) {
    throw new Error(`Draft snapshot gate failed for context "${slug}"`);
  }

  const publishedAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from('best_snapshots')
    .update({
      status: 'published',
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq('id', draft.id);

  if (updateError) {
    throw new Error(`Failed to publish best snapshot for "${slug}": ${updateError.message}`);
  }

  return {
    contextSlug: slug,
    snapshotId: draft.id,
    version: draft.version,
    publishedAt,
  };
}
