/**
 * Comparison Pages Sitemap
 * All /compare/[tool-a]-vs-[tool-b] pages
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.io';

export const prerender = false;

export const GET: APIRoute = async () => {
  const urls: { loc: string; lastmod?: string; changefreq: string; priority: number }[] = [];

  try {
    const seen = new Set<string>();

    const { data: comparisons } = await supabase
      .from('compare_snapshots')
      .select('tool_a_slug, tool_b_slug, published_at, computed_at, spec_key')
      .eq('status', 'published')
      .is('spec_key', null)
      .order('published_at', { ascending: false })
      .limit(2000);

    if (comparisons) {
      for (const comp of comparisons) {
        // Alphabetical order for canonical URL
        const [slugA, slugB] = [comp.tool_a_slug, comp.tool_b_slug].sort();
        if (!slugA || !slugB) continue;
        const key = `${slugA}::${slugB}`;
        if (seen.has(key)) continue;
        seen.add(key);
        urls.push({
          loc: `${SITE_URL}/compare/${slugA}-vs-${slugB}`,
          lastmod: (comp.published_at || comp.computed_at)?.split('T')[0],
          changefreq: 'monthly',
          priority: 0.6,
        });
      }
    }

    // Fallback source: curated comparison insights (useful when snapshots are sparse)
    const { data: insights } = await supabase
      .from('comparison_insights')
      .select('item_a_slug, item_b_slug, updated_at')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (insights) {
      for (const comp of insights) {
        const [slugA, slugB] = [comp.item_a_slug, comp.item_b_slug].sort();
        if (!slugA || !slugB) continue;
        const key = `${slugA}::${slugB}`;
        if (seen.has(key)) continue;
        seen.add(key);
        urls.push({
          loc: `${SITE_URL}/compare/${slugA}-vs-${slugB}`,
          lastmod: comp.updated_at?.split('T')[0],
          changefreq: 'monthly',
          priority: 0.5,
        });
      }
    }
  } catch (error) {
    console.error('[Sitemap-Compare] Error:', error);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
};
