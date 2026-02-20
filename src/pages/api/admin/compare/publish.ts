import type { APIRoute } from 'astro';
import { validateAdminAuth } from '@/lib/auth';
import { publishCompareSnapshot } from '@/lib/compiler/compare/publish-compare-snapshot';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await validateAdminAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as {
      slug_a?: string;
      slug_b?: string;
      spec_key?: string | null;
    };

    const slugA = typeof body.slug_a === 'string' ? body.slug_a.trim() : '';
    const slugB = typeof body.slug_b === 'string' ? body.slug_b.trim() : '';
    if (!slugA || !slugB) {
      return new Response(JSON.stringify({ error: 'slug_a and slug_b are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await publishCompareSnapshot(slugA, slugB, body.spec_key ?? null);
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[admin][compare][publish] Failed to publish snapshot:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish compare snapshot',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
