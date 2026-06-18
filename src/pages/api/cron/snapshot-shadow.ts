import type { APIRoute } from 'astro';
import { ApiResponse } from '@/lib/api-response';
import { verifyCronSecret } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { compileBestSnapshotDraft } from '@/lib/compiler/best/compile-best-snapshot';
import { compileCompareSnapshotDraft } from '@/lib/compiler/compare/compile-compare-snapshot';
import { normalizeComparePair } from '@/lib/compiler/snapshot-helpers';

export const prerender = false;

function parseCap(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export const POST: APIRoute = async ({ request }) => {
  const authResult = verifyCronSecret(request, {
    secret: import.meta.env.CRON_SECRET,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  });

  if (!authResult.valid) {
    if (authResult.error === 'Server misconfiguration') {
      return ApiResponse.internalError('Server misconfiguration');
    }
    return ApiResponse.unauthorized('Invalid cron secret');
  }

  try {
    const admin = getAdminClient();
    const bestLimit = parseCap(process.env.SHADOW_COMPILE_BEST_LIMIT, 10);
    const compareLimit = parseCap(process.env.SHADOW_COMPILE_COMPARE_LIMIT, 10);

    const { data: contexts, error: contextError } = await admin
      .from('contexts')
      .select('id, slug')
      .not('slug', 'is', null)
      .gt('published_reviews_count', 0)
      .order('published_reviews_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(bestLimit);

    if (contextError) {
      return ApiResponse.internalError(`Failed to load contexts: ${contextError.message}`);
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

      const rawA = String((topReviews[0] as any)?.item?.slug || '')
        .trim()
        .toLowerCase();
      const rawB = String((topReviews[1] as any)?.item?.slug || '')
        .trim()
        .toLowerCase();
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

    return ApiResponse.ok({
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
    });
  } catch (error) {
    console.error('[cron][snapshot-shadow] failed:', error);
    return ApiResponse.internalError('Shadow snapshot compile failed');
  }
};

export const GET: APIRoute = async ({ request }) => {
  if (import.meta.env.PROD) {
    return ApiResponse.forbidden('GET not allowed in production');
  }
  return POST({ request } as any);
};
