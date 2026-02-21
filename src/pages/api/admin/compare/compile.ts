import type { APIRoute } from 'astro';
import { validateAdminAuth } from '@/lib/auth';
import { compileCompareSnapshotDraft } from '@/lib/compiler/compare/compile-compare-snapshot';
import { logSnapshotAction } from '@/lib/compiler/audit-log';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await validateAdminAuth(cookies))) {
    await logSnapshotAction({
      action: 'compare.compile',
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
    const body = (await request.json()) as {
      slug_a?: string;
      slug_b?: string;
      policy_version?: string | null;
      spec_key?: string | null;
      spec_version?: string | null;
    };

    const slugA = typeof body.slug_a === 'string' ? body.slug_a.trim() : '';
    const slugB = typeof body.slug_b === 'string' ? body.slug_b.trim() : '';
    if (!slugA || !slugB) {
      return new Response(JSON.stringify({ error: 'slug_a and slug_b are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await compileCompareSnapshotDraft(slugA, slugB, {
      policyVersion: body.policy_version ?? null,
      specKey: body.spec_key ?? null,
      specVersion: body.spec_version ?? null,
    });

    await logSnapshotAction({
      action: 'compare.compile',
      status: 'success',
      request,
      cookies,
      details: { slug_a: slugA, slug_b: slugB, spec_key: body.spec_key ?? null, result },
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[admin][compare][compile] Failed to compile snapshot:', error);
    await logSnapshotAction({
      action: 'compare.compile',
      status: 'error',
      request,
      cookies,
      details: {},
      error: error instanceof Error ? error.message : 'Failed to compile compare snapshot',
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compile compare snapshot',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
