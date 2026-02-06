/**
 * API: Create Draft Article
 * POST /api/admin/articles
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import {
  checkRateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  getClientIP,
  hashIdentifier,
} from '@/lib/rate-limit';
import { slugify } from '@/lib/hunter/utils';

interface ArticleRequest {
  title: string;
  slug?: string;
  summary_markdown?: string;
  content_markdown?: string;
  tags?: string[];
  source_tool_ids?: string[];
  source_context_ids?: string[];
  source_data?: Record<string, unknown>;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIP(request, clientAddress);
  const hashedIP = hashIdentifier(ip);
  const rateLimit = await checkRateLimit(hashedIP, '/api/admin/articles', {
    maxRequests: 10,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ArticleRequest = await request.json();
    const {
      title,
      slug,
      summary_markdown,
      content_markdown,
      tags,
      source_tool_ids,
      source_context_ids,
      source_data,
    } = body;

    if (!title || typeof title !== 'string') {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Title is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    const MAX_TITLE_LENGTH = 200;
    const MAX_SLUG_LENGTH = 200;

    if (title.length > MAX_TITLE_LENGTH) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ success: false, error: `Title exceeds ${MAX_TITLE_LENGTH} characters` }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        rateLimit
      );
    }

    const finalSlug = (slug && typeof slug === 'string' ? slug : slugify(title)).slice(
      0,
      MAX_SLUG_LENGTH
    );

    const adminClient = getAdminClient();

    const { data, error } = await adminClient
      .from('articles')
      .insert({
        title: title.trim(),
        slug: finalSlug,
        status: 'draft',
        summary_markdown: summary_markdown || null,
        content_markdown: content_markdown || null,
        tags: Array.isArray(tags) ? tags : [],
        source_tool_ids: Array.isArray(source_tool_ids) ? source_tool_ids : [],
        source_context_ids: Array.isArray(source_context_ids) ? source_context_ids : [],
        source_data: source_data || null,
      })
      .select('id, title, slug, status, created_at')
      .single();

    if (error) {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    return addRateLimitHeaders(
      new Response(JSON.stringify({ success: true, article: data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
      rateLimit
    );
  } catch (err) {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
      rateLimit
    );
  }
};
