import type { APIRoute } from 'astro';
import { validateAdminAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { diffRankings, diffWinner } from '@/lib/compiler/diff-report';

export const prerender = false;

function parseLimit(value: unknown, fallback: number, max = 500): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function normalizeStatus(value: unknown): 'draft' | 'published' {
  return String(value || '').toLowerCase() === 'published' ? 'published' : 'draft';
}

function asSnapshotRanked(snapshotJson: unknown): Array<{ id: string; score: number | null }> {
  if (!snapshotJson || typeof snapshotJson !== 'object') return [];
  const obj = snapshotJson as Record<string, unknown>;
  const ranked = obj.ranked || obj.ranked_tools || obj.items;
  if (!Array.isArray(ranked)) return [];
  return ranked
    .map((entry) => ({
      id: String((entry as any)?.item_id || (entry as any)?.tool_id || '').trim(),
      score: typeof (entry as any)?.score === 'number' ? (entry as any).score : null,
    }))
    .filter((entry) => entry.id.length > 0);
}

function runtimeWinnerFromScores(scoreA: number, scoreB: number): string {
  const delta = Number((scoreA - scoreB).toFixed(1));
  if (Math.abs(delta) < 1.5) return 'depends';
  return delta > 0 ? 'a' : 'b';
}

function snapshotWinnerToAB(snapshotWinner: string | null, toolASlug: string, toolBSlug: string): string | null {
  if (!snapshotWinner) return null;
  if (snapshotWinner === 'depends' || snapshotWinner === 'tie') return 'depends';
  if (snapshotWinner === toolASlug) return 'a';
  if (snapshotWinner === toolBSlug) return 'b';
  return snapshotWinner;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await validateAdminAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      target?: 'best' | 'compare';
      sample?: number;
      status?: 'draft' | 'published';
    };
    const target = body.target === 'compare' ? 'compare' : 'best';
    const sample = parseLimit(body.sample, 50);
    const status = normalizeStatus(body.status);
    const admin = getAdminClient();

    if (target === 'best') {
      const { data: contexts, error: contextError } = await admin
        .from('contexts')
        .select('id, slug')
        .gt('tool_count', 0)
        .not('slug', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(sample);

      if (contextError) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to load contexts: ${contextError.message}` }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      let compared = 0;
      let missingSnapshots = 0;
      let overlapRateSum = 0;
      let topKAgreementSum = 0;

      for (const context of contexts || []) {
        const { data: reviews, error: reviewsError } = await admin
          .from('reviews')
          .select('item_id, score')
          .eq('context_id', context.id)
          .eq('status', 'published')
          .order('score', { ascending: false })
          .limit(30);
        if (reviewsError) continue;

        const runtimeEntries = (reviews || [])
          .filter((row: any) => Boolean(row.item_id))
          .map((row: any) => ({ id: row.item_id as string, score: row.score ?? null }));
        if (runtimeEntries.length === 0) continue;

        const { data: snapshotRows, error: snapshotError } = await admin
          .from('best_snapshots')
          .select('snapshot_json')
          .eq('context_slug', context.slug)
          .eq('status', status)
          .order('computed_at', { ascending: false })
          .limit(1);
        if (snapshotError) continue;

        const snapshotRow = snapshotRows?.[0] as { snapshot_json?: unknown } | undefined;
        if (!snapshotRow?.snapshot_json) {
          missingSnapshots += 1;
          continue;
        }

        const snapshotEntries = asSnapshotRanked(snapshotRow.snapshot_json);
        const diff = diffRankings(runtimeEntries, snapshotEntries, 5);

        compared += 1;
        overlapRateSum += diff.overlapRate;
        topKAgreementSum += diff.topKAgreementRate;
      }

      return new Response(
        JSON.stringify({
          success: true,
          target,
          status,
          sampled: (contexts || []).length,
          compared,
          missingSnapshots,
          avgOverlapRate: compared > 0 ? overlapRateSum / compared : 0,
          avgTopKAgreementRate: compared > 0 ? topKAgreementSum / compared : 0,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: compareRows, error: compareError } = await admin
      .from('compare_snapshots')
      .select('tool_a_slug, tool_b_slug, snapshot_json')
      .eq('status', status)
      .order('computed_at', { ascending: false })
      .limit(sample);

    if (compareError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to load compare snapshots: ${compareError.message}` }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let compared = 0;
    let matches = 0;

    for (const row of compareRows || []) {
      const { data: tools, error: toolsError } = await admin
        .from('items')
        .select('slug, avg_score')
        .in('slug', [row.tool_a_slug, row.tool_b_slug])
        .limit(2);
      if (toolsError || !tools || tools.length !== 2) continue;

      const toolA = tools.find((tool: any) => tool.slug === row.tool_a_slug) as any;
      const toolB = tools.find((tool: any) => tool.slug === row.tool_b_slug) as any;
      if (!toolA || !toolB) continue;

      const runtimeWinner = runtimeWinnerFromScores(Number(toolA.avg_score || 0), Number(toolB.avg_score || 0));
      const snapshotWinnerRaw =
        typeof (row as any)?.snapshot_json?.verdict?.winner === 'string'
          ? String((row as any).snapshot_json.verdict.winner).toLowerCase()
          : null;
      const snapshotWinner = snapshotWinnerToAB(snapshotWinnerRaw, row.tool_a_slug, row.tool_b_slug);

      const diff = diffWinner(runtimeWinner, snapshotWinner);
      compared += 1;
      if (diff.matches) matches += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        target,
        status,
        sampled: (compareRows || []).length,
        compared,
        winnerMatches: matches,
        winnerAgreementRate: compared > 0 ? matches / compared : 0,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Parity computation failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
