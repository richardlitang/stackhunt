/**
 * Gear Sitemap
 * All /gear/[slug] pages
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.io';

export const prerender = false;

export const GET: APIRoute = async () => {
  const urls: { loc: string; lastmod?: string; changefreq: string; priority: number }[] = [];

  // Add gear index page
  urls.push({
    loc: `${SITE_URL}/gear`,
    changefreq: 'weekly',
    priority: 0.7,
  });

  try {
    const { data: gear } = await supabase
      .from('items')
      .select('slug, updated_at')
      .eq('type', 'gear')
      .order('updated_at', { ascending: false });

    if (gear) {
      for (const item of gear) {
        urls.push({
          loc: `${SITE_URL}/gear/${item.slug}`,
          lastmod: item.updated_at?.split('T')[0],
          changefreq: 'monthly',
          priority: 0.6,
        });
      }
    }
  } catch (error) {
    console.error('[Sitemap-Gear] Error:', error);
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
