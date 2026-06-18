import type { APIRoute } from 'astro';
import { validateAdminAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { publishBestSnapshot } from '@/lib/compiler/best/publish-best-snapshot';
import { publishCompareSnapshot } from '@/lib/compiler/compare/publish-compare-snapshot';
import { logSnapshotAction } from '@/lib/compiler/audit-log';

export const prerender = false;

function parseCap(value: unknown, fallback: number, max = 200): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await validateAdminAuth(cookies))) {
    await logSnapshotAction({
      action: 'snapshots.publish-shadow',
      status: 'denied',
      request,
      cookies,
      details: {},
      error: 'Unauthorized',
    });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      apply?: boolean;
      best_limit?: number;
      compare_limit?: number;
    };

    const apply = Boolean(body.apply);
    const bestLimit = parseCap(body.best_limit, 10);
    const compareLimit = parseCap(body.compare_limit, 10);
    const admin = getAdminClient();

    const { data: bestDrafts, error: bestError } = await admin
      .from('best_snapshots')
      .select('context_slug, computed_at, snapshot_json')
      .eq('status', 'draft')
      .order('computed_at', { ascending: false })
      .limit(bestLimit * 5);

    if (bestError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to load best drafts: ${bestError.message}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const bestEligible = (bestDrafts || [])
      .filter((row: any) => Boolean(row?.context_slug))
      .filter((row: any) => Boolean(row?.snapshot_json?.publish_gate?.pass))
      .map((row: any) => String(row.context_slug))
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, bestLimit);

    const { data: compareDrafts, error: compareError } = await admin
      .from('compare_snapshots')
      .select('tool_a_slug, tool_b_slug, spec_key, computed_at, snapshot_json')
      .eq('status', 'draft')
      .order('computed_at', { ascending: false })
      .limit(compareLimit * 5);

    if (compareError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to load compare drafts: ${compareError.message}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const compareEligible = (compareDrafts || [])
      .filter((row: any) => Boolean(row?.tool_a_slug && row?.tool_b_slug))
      .filter((row: any) => Boolean(row?.snapshot_json?.publish_gate?.pass))
      .map((row: any) => ({
        slugA: String(row.tool_a_slug),
        slugB: String(row.tool_b_slug),
        specKey: typeof row.spec_key === 'string' ? row.spec_key : null,
        key: `${row.tool_a_slug}-vs-${row.tool_b_slug}::${row.spec_key || ''}`,
      }))
      .filter(
        (row, index, arr) => arr.findIndex((candidate) => candidate.key === row.key) === index
      )
      .slice(0, compareLimit);

    if (!apply) {
      const payload = {
        success: true,
        mode: 'dry-run',
        bestEligible,
        compareEligible: compareEligible.map((row) => ({
          pair: `${row.slugA}-vs-${row.slugB}`,
          specKey: row.specKey,
        })),
        timestamp: new Date().toISOString(),
      };
      await logSnapshotAction({
        action: 'snapshots.publish-shadow',
        status: 'success',
        request,
        cookies,
        details: {
          mode: 'dry-run',
          best_limit: bestLimit,
          compare_limit: compareLimit,
          best_eligible: bestEligible.length,
          compare_eligible: payload.compareEligible.length,
        },
      });
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bestPublished: Array<{ slug: string; ok: boolean; error?: string; version?: number }> =
      [];
    for (const slug of bestEligible) {
      try {
        const result = await publishBestSnapshot(slug);
        bestPublished.push({ slug, ok: true, version: result.version });
      } catch (error) {
        bestPublished.push({
          slug,
          ok: false,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    const comparePublished: Array<{ pair: string; ok: boolean; error?: string; version?: number }> =
      [];
    for (const pair of compareEligible) {
      try {
        const result = await publishCompareSnapshot(pair.slugA, pair.slugB, pair.specKey);
        comparePublished.push({ pair: result.pair, ok: true, version: result.version });
      } catch (error) {
        comparePublished.push({
          pair: `${pair.slugA}-vs-${pair.slugB}`,
          ok: false,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    const payload = {
      success: true,
      mode: 'apply',
      best: {
        attempted: bestEligible.length,
        succeeded: bestPublished.filter((row) => row.ok).length,
        results: bestPublished,
      },
      compare: {
        attempted: compareEligible.length,
        succeeded: comparePublished.filter((row) => row.ok).length,
        results: comparePublished,
      },
      timestamp: new Date().toISOString(),
    };

    await logSnapshotAction({
      action: 'snapshots.publish-shadow',
      status: 'success',
      request,
      cookies,
      details: {
        mode: 'apply',
        best_limit: bestLimit,
        compare_limit: compareLimit,
        best_attempted: payload.best.attempted,
        best_succeeded: payload.best.succeeded,
        compare_attempted: payload.compare.attempted,
        compare_succeeded: payload.compare.succeeded,
      },
    });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    await logSnapshotAction({
      action: 'snapshots.publish-shadow',
      status: 'error',
      request,
      cookies,
      details: {},
      error: error instanceof Error ? error.message : 'Failed to publish shadow snapshots',
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish shadow snapshots',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
