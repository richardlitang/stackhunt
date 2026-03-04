/**
 * Best Lists Sitemap
 * All /best/[slug] pages (contexts)
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.io';
const EXCLUDED_ALIAS_SLUGS = new Set([
  'lightweight-crm-for-startup-sales-teams',
  'crm-platform-for-startup-revenue-teams',
]);

export const prerender = false;

export const GET: APIRoute = async () => {
  const urls: { loc: string; lastmod?: string; changefreq: string; priority: number }[] = [];

  try {
    const { data: contexts } = await supabase
      .from('contexts')
      .select('slug, updated_at, tool_count')
      .order('updated_at', { ascending: false })
      .limit(2000);

    if (contexts) {
      for (const ctx of contexts) {
        if (EXCLUDED_ALIAS_SLUGS.has(ctx.slug)) continue;
        if (Number(ctx.tool_count || 0) < 2) continue;
        urls.push({
          loc: `${SITE_URL}/best/${ctx.slug}`,
          lastmod: ctx.updated_at?.split('T')[0],
          changefreq: 'weekly',
          priority: 0.9,
        });
      }
    }
  } catch (error) {
    console.error('[Sitemap-Best] Error:', error);
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
