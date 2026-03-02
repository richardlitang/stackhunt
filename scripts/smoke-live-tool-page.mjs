#!/usr/bin/env node

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [k, ...rest] = arg.slice(2).split('=');
      return [k, rest.join('=') || 'true'];
    })
);

const baseUrl = (args.get('base-url') || process.env.SITE_URL || 'https://stackhunt.io').replace(
  /\/$/,
  ''
);
const slug = args.get('slug') || 'chatgpt';

const legacyMarkers = ['Tool Briefing', 'In 10 Seconds', 'Internal index', 'Published Analyses'];

function randomVersion() {
  return String(Date.now()) + String(Math.floor(Math.random() * 100000));
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  const html = await res.text();
  return {
    url,
    status: res.status,
    cacheControl: res.headers.get('cache-control') || '',
    html,
  };
}

function findMarkers(html) {
  return legacyMarkers.filter((marker) => html.includes(marker));
}

async function main() {
  const plainUrl = `${baseUrl}/tool/${slug}`;
  const cacheBustUrl = `${plainUrl}?v=${randomVersion()}`;

  const [plain, busted] = await Promise.all([fetchHtml(plainUrl), fetchHtml(cacheBustUrl)]);
  const plainFound = findMarkers(plain.html);
  const bustedFound = findMarkers(busted.html);

  console.log(`plain: ${plain.url} [${plain.status}] cache-control="${plain.cacheControl}"`);
  console.log(`bust:  ${busted.url} [${busted.status}] cache-control="${busted.cacheControl}"`);
  if (plainFound.length > 0) {
    console.log(`plain contains legacy markers: ${plainFound.join(', ')}`);
  }
  if (bustedFound.length > 0) {
    console.log(`bust contains legacy markers: ${bustedFound.join(', ')}`);
  }

  if (plain.status >= 400 || busted.status >= 400) {
    process.exitCode = 1;
    return;
  }

  if (plainFound.length > 0 || bustedFound.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('smoke-live-tool-page: PASS');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
