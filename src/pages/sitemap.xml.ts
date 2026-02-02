/**
 * Static Sitemap with ISR (Incremental Static Regeneration)
 *
 * - Served as static XML (good for Google SEO)
 * - Auto-regenerates every 6 hours from database
 * - No redeploy needed when content changes
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.io';

// ISR: Regenerate every 6 hours (21600 seconds)
export const prerender = false;

export const GET: APIRoute = async () => {
  const urls: { loc: string; lastmod?: string; changefreq: string; priority: number }[] = [];

  // Static pages
  urls.push(
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${SITE_URL}/best`, changefreq: 'daily', priority: 0.9 },
    { loc: `${SITE_URL}/categories`, changefreq: 'weekly', priority: 0.8 },
  );

  try {
    // Fetch all tools
    const { data: tools } = await supabase
      .from('items')
      .select('slug, updated_at')
      .eq('type', 'tool')
      .order('updated_at', { ascending: false });

    if (tools) {
      for (const tool of tools) {
        urls.push({
          loc: `${SITE_URL}/tool/${tool.slug}`,
          lastmod: tool.updated_at?.split('T')[0],
          changefreq: 'weekly',
          priority: 0.8,
        });
      }
    }

    // Fetch all contexts (best lists)
    const { data: contexts } = await supabase
      .from('contexts')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false });

    if (contexts) {
      for (const ctx of contexts) {
        urls.push({
          loc: `${SITE_URL}/best/${ctx.slug}`,
          lastmod: ctx.updated_at?.split('T')[0],
          changefreq: 'weekly',
          priority: 0.9,
        });
      }
    }

    // Fetch all categories
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false });

    if (categories) {
      for (const cat of categories) {
        urls.push({
          loc: `${SITE_URL}/categories/${cat.slug}`,
          lastmod: cat.updated_at?.split('T')[0],
          changefreq: 'weekly',
          priority: 0.7,
        });
      }
    }

    // Fetch comparison pages
    const { data: comparisons } = await supabase
      .from('comparison_insights')
      .select('item_a_slug, item_b_slug, updated_at')
      .order('updated_at', { ascending: false });

    if (comparisons) {
      for (const comp of comparisons) {
        const [slugA, slugB] = [comp.item_a_slug, comp.item_b_slug].sort();
        urls.push({
          loc: `${SITE_URL}/compare/${slugA}-vs-${slugB}`,
          lastmod: comp.updated_at?.split('T')[0],
          changefreq: 'monthly',
          priority: 0.6,
        });
      }
    }

  } catch (error) {
    console.error('[Sitemap] Error fetching data:', error);
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      // ISR: Serve stale while revalidating, regenerate every 6 hours
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
};
