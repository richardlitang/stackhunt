import type { APIRoute } from 'astro';
import { validateAdminAuth } from '@/lib/auth';
import { publishBestSnapshot } from '@/lib/compiler/best/publish-best-snapshot';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await validateAdminAuth(cookies))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json()) as { context_slug?: string };
    const contextSlug = typeof body.context_slug === 'string' ? body.context_slug.trim() : '';
    if (!contextSlug) {
      return new Response(JSON.stringify({ error: 'context_slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await publishBestSnapshot(contextSlug);
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[admin][best][publish] Failed to publish snapshot:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish best snapshot',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
