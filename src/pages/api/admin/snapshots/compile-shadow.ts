import type { APIRoute } from 'astro';
import { validateAdminAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { compileBestSnapshotDraft } from '@/lib/compiler/best/compile-best-snapshot';
import { compileCompareSnapshotDraft } from '@/lib/compiler/compare/compile-compare-snapshot';
import { normalizeComparePair } from '@/lib/compiler/snapshot-helpers';

export const prerender = false;

function parseCap(value: unknown, fallback: number, max = 200): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
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
      best_limit?: number;
      compare_limit?: number;
    };

    const bestLimit = parseCap(body.best_limit, 10);
    const compareLimit = parseCap(body.compare_limit, 10);
    const admin = getAdminClient();

    const { data: contexts, error: contextError } = await admin
      .from('contexts')
      .select('id, slug')
      .not('slug', 'is', null)
      .gt('published_reviews_count', 0)
      .order('published_reviews_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(bestLimit);

    if (contextError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to load contexts: ${contextError.message}` }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const bestResults: Array<{ slug: string; ok: boolean; error?: string }> = [];
    for (const context of contexts || []) {
      if (!context.slug) continue;
      try {
        await compileBestSnapshotDraft(context.slug);
        bestResults.push({ slug: context.slug, ok: true });
      } catch (error) {
        bestResults.push({
          slug: context.slug,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const pairSet = new Set<string>();
    for (const context of contexts || []) {
      if (pairSet.size >= compareLimit) break;
      if (!context.id) continue;

      const { data: topReviews, error: reviewError } = await admin
        .from('reviews')
        .select('item:items(slug)')
        .eq('context_id', context.id)
        .eq('status', 'published')
        .order('score', { ascending: false })
        .limit(2);

      if (reviewError || !topReviews || topReviews.length < 2) continue;

      const rawA = String((topReviews[0] as any)?.item?.slug || '').trim().toLowerCase();
      const rawB = String((topReviews[1] as any)?.item?.slug || '').trim().toLowerCase();
      if (!rawA || !rawB || rawA === rawB) continue;

      const normalized = normalizeComparePair(rawA, rawB);
      pairSet.add(`${normalized.toolASlug}-vs-${normalized.toolBSlug}`);
    }

    const compareResults: Array<{ pair: string; ok: boolean; error?: string }> = [];
    for (const pair of Array.from(pairSet).slice(0, compareLimit)) {
      const [slugA, slugB] = pair.split('-vs-');
      try {
        await compileCompareSnapshotDraft(slugA, slugB);
        compareResults.push({ pair, ok: true });
      } catch (error) {
        compareResults.push({
          pair,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        best: {
          attempted: bestResults.length,
          succeeded: bestResults.filter((row) => row.ok).length,
          failures: bestResults.filter((row) => !row.ok),
        },
        compare: {
          attempted: compareResults.length,
          succeeded: compareResults.filter((row) => row.ok).length,
          failures: compareResults.filter((row) => !row.ok),
        },
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
        error: error instanceof Error ? error.message : 'Failed to compile shadow snapshots',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
