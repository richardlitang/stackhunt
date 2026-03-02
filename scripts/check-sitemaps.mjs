#!/usr/bin/env node

const baseUrl = (process.env.SITE_URL || process.argv[2] || 'https://stackhunt.io').replace(/\/$/, '');

function extractLocs(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1].trim());
}

async function fetchText(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      const text = await response.text();
      return {
        url,
        status: response.status,
        contentType: (response.headers.get('content-type') || '').toLowerCase(),
        text,
      };
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  const indexUrl = `${baseUrl}/sitemap.xml`;
  console.log(`[sitemap-check] Base URL: ${baseUrl}`);

  const index = await fetchText(indexUrl);
  if (index.status !== 200) {
    throw new Error(`sitemap index returned ${index.status}: ${indexUrl}`);
  }
  if (!index.contentType.includes('xml')) {
    throw new Error(`sitemap index is not XML content-type: ${index.contentType || 'missing'}`);
  }

  const childSitemaps = extractLocs(index.text).filter((loc) => /\/sitemap-.*\.xml$/i.test(loc));
  if (childSitemaps.length === 0) {
    throw new Error('no child sitemaps found in sitemap index');
  }

  console.log(`[sitemap-check] Child sitemaps discovered: ${childSitemaps.length}`);

  let failed = false;
  for (const sitemapUrl of childSitemaps) {
    const result = await fetchText(sitemapUrl);
    const locCount = result.status === 200 ? extractLocs(result.text).length : 0;

    if (result.status !== 200) {
      console.error(`[sitemap-check] FAIL ${sitemapUrl} -> HTTP ${result.status}`);
      failed = true;
      continue;
    }

    if (!result.contentType.includes('xml')) {
      console.error(`[sitemap-check] FAIL ${sitemapUrl} -> non-XML content-type: ${result.contentType || 'missing'}`);
      failed = true;
      continue;
    }

    const isCommonEmptySitemap = /\/sitemap-(compare|articles)\.xml$/i.test(sitemapUrl);
    if (locCount === 0 && !isCommonEmptySitemap) {
      console.error(`[sitemap-check] FAIL ${sitemapUrl} -> 0 URLs`);
      failed = true;
      continue;
    }

    if (locCount === 0) {
      console.warn(`[sitemap-check] WARN ${sitemapUrl} -> 0 URLs`);
    } else {
      console.log(`[sitemap-check] OK   ${sitemapUrl} -> ${locCount} URLs`);
    }
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log('[sitemap-check] PASS');
}

main().catch((error) => {
  console.error(`[sitemap-check] ERROR ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
