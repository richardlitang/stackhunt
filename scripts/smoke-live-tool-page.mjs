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
const slugArg = args.get('slug') || 'chatgpt';
const slugs = slugArg
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const legacyMarkers = ['Tool Briefing', 'In 10 Seconds', 'Internal index', 'Published Analyses'];
const specSheetMarkers = [
  'Decision Snapshot',
  'Capabilities & Differentiators',
  'Community Insights',
  'TL;DR',
];
const requiredMarkers = ['How We Evaluated', 'Decision in 60 Seconds'];
const blockedPhrases = ['across pricing, fit, and rollout risk'];

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
  let failed = false;
  for (const slug of slugs) {
    const plainUrl = `${baseUrl}/tool/${slug}`;
    const cacheBustUrl = `${plainUrl}?v=${randomVersion()}`;

    const [plain, busted] = await Promise.all([fetchHtml(plainUrl), fetchHtml(cacheBustUrl)]);
    const plainFound = findMarkers(plain.html);
    const bustedFound = findMarkers(busted.html);
    const plainSpecSheet = specSheetMarkers.filter((marker) => plain.html.includes(marker));
    const bustedSpecSheet = specSheetMarkers.filter((marker) => busted.html.includes(marker));
    const plainMissingRequired = requiredMarkers.filter((marker) => !plain.html.includes(marker));
    const bustedMissingRequired = requiredMarkers.filter((marker) => !busted.html.includes(marker));
    const plainBlockedPhrases = blockedPhrases.filter((phrase) => plain.html.includes(phrase));
    const bustedBlockedPhrases = blockedPhrases.filter((phrase) => busted.html.includes(phrase));
    const h1Match = plain.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1Text = (h1Match?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    console.log(`\n=== ${slug} ===`);
    console.log(`plain: ${plain.url} [${plain.status}] cache-control="${plain.cacheControl}"`);
    console.log(`bust:  ${busted.url} [${busted.status}] cache-control="${busted.cacheControl}"`);
    console.log(`h1: "${h1Text}"`);
    if (plainFound.length > 0) {
      console.log(`plain contains legacy markers: ${plainFound.join(', ')}`);
    }
    if (bustedFound.length > 0) {
      console.log(`bust contains legacy markers: ${bustedFound.join(', ')}`);
    }
    if (plainSpecSheet.length > 0 || bustedSpecSheet.length > 0) {
      console.log(
        `spec-sheet markers found: plain=[${plainSpecSheet.join(', ')}] bust=[${bustedSpecSheet.join(', ')}]`
      );
    }
    if (plainMissingRequired.length > 0 || bustedMissingRequired.length > 0) {
      console.log(
        `missing required markers: plain=[${plainMissingRequired.join(', ')}] bust=[${bustedMissingRequired.join(', ')}]`
      );
    }
    if (plainBlockedPhrases.length > 0 || bustedBlockedPhrases.length > 0) {
      console.log(
        `blocked phrases found: plain=[${plainBlockedPhrases.join(', ')}] bust=[${bustedBlockedPhrases.join(', ')}]`
      );
    }
    if (!/\breview\b/i.test(h1Text)) {
      console.log(`h1 missing review intent: "${h1Text}"`);
    }

    const slugFailed =
      plain.status >= 400 ||
      busted.status >= 400 ||
      plainFound.length > 0 ||
      bustedFound.length > 0 ||
      plainSpecSheet.length > 0 ||
      bustedSpecSheet.length > 0 ||
      plainMissingRequired.length > 0 ||
      bustedMissingRequired.length > 0 ||
      plainBlockedPhrases.length > 0 ||
      bustedBlockedPhrases.length > 0 ||
      !/\breview\b/i.test(h1Text);

    if (slugFailed) failed = true;
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log('\nsmoke-live-tool-page: PASS');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
