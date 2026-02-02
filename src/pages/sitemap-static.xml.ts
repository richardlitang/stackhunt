/**
 * Static Pages Sitemap
 */

import type { APIRoute } from 'astro';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.io';

export const prerender = false;

export const GET: APIRoute = async () => {
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${SITE_URL}/best`, changefreq: 'daily', priority: 0.9 },
    { loc: `${SITE_URL}/categories`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${SITE_URL}/tools`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${SITE_URL}/methodology`, changefreq: 'monthly', priority: 0.5 },
    { loc: `${SITE_URL}/privacy`, changefreq: 'monthly', priority: 0.3 },
    { loc: `${SITE_URL}/disclosure`, changefreq: 'monthly', priority: 0.3 },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
};
