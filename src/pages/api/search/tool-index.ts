/**
 * API: Tool Search Index (lightweight)
 *
 * Returns a cached lightweight list of tools for client-side suggestion UIs.
 * This avoids repeated DB queries while typing.
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { formatScore, truncateVerdict } from '@/lib/homepage';

type ToolIndexEntry = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  short_description: string | null;
  score: string | null;
  verdict: string;
};

export function mapToolIndexEntry(row: {
  id: string; name: string; slug: string;
  logo_url: string | null; short_description: string | null;
  avg_score: number | null; verdict: string | null;
}): ToolIndexEntry {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url || null,
    short_description: row.short_description || null,
    score: formatScore(row.avg_score),
    verdict: truncateVerdict(row.verdict, 70),
  };
}

const MAX_TOOL_INDEX_SIZE = 5000;
const INDEX_TTL_MS = 10 * 60 * 1000; // 10 minutes (server instance cache)

let toolIndexCache: { expiresAt: number; items: ToolIndexEntry[] } | null = null;
let inflightLoad: Promise<ToolIndexEntry[]> | null = null;

async function loadToolIndex(): Promise<ToolIndexEntry[]> {
  const now = Date.now();
  if (toolIndexCache && toolIndexCache.expiresAt > now) {
    return toolIndexCache.items;
  }

  if (inflightLoad) return inflightLoad;

  inflightLoad = (async () => {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, slug, logo_url, short_description, avg_score, verdict')
      .eq('type', 'tool')
      .not('slug', 'is', null)
      .order('name', { ascending: true })
      .limit(MAX_TOOL_INDEX_SIZE);

    if (error) throw error;

    const items = (data || []).map((row) => mapToolIndexEntry(row as any));

    toolIndexCache = {
      items,
      expiresAt: Date.now() + INDEX_TTL_MS,
    };

    return items;
  })();

  try {
    return await inflightLoad;
  } finally {
    inflightLoad = null;
  }
}

export const GET: APIRoute = async () => {
  try {
    const items = await loadToolIndex();

    return new Response(
      JSON.stringify({
        success: true,
        items,
        count: items.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
        },
      }
    );
  } catch (err) {
    console.error('Failed to build tool search index:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
