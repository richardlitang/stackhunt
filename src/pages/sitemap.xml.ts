/**
 * Sitemap Index (Master File)
 *
 * Points to child sitemaps by content type.
 * Follows Google's sitemap index best practices.
 * ISR: Regenerates every 6 hours.
 */

import type { APIRoute } from 'astro';

const SITE_URL = import.meta.env.PUBLIC_SITE_URL || 'https://stackhunt.io';

export const prerender = false;

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split('T')[0];

  const sitemaps = [
    { loc: `${SITE_URL}/sitemap-static.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-tools.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-best.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-categories.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-compare.xml`, lastmod: today },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
};
