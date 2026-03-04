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
const debugSnippets = args.get('debug-snippets') === 'true';
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
const genericNarrativePhrases = [
  'best value threshold',
  'worth it when',
  'platform access is limited to web-based environments',
];
const contradictoryFreePlanPattern = /\b(no|lack(?:s| of)?)\s+(?:a\s+)?free\s+(?:tier|plan)\b/i;
const positiveFreeSignalPattern = /\b(freemium|free\s+tier|free\s+plan)\b/i;
const webOnlyPattern =
  /\b(platform access is limited to web-based environments|web[-\s]*only|web-based environments only)\b/i;
const nonWebPlatformPattern = /\b(ios|android|windows|mac(?:os)?|desktop app|desktop apps)\b/i;

function stripHtml(input) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function countMatches(input, pattern) {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}

function snippetAround(text, phrase, radius = 140) {
  const lower = text.toLowerCase();
  const needle = phrase.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + phrase.length + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

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
    const plainText = stripHtml(plain.html);
    const bustedText = stripHtml(busted.html);
    const plainSpecSheet = specSheetMarkers.filter((marker) => plain.html.includes(marker));
    const bustedSpecSheet = specSheetMarkers.filter((marker) => busted.html.includes(marker));
    const plainMissingRequired = requiredMarkers.filter((marker) => !plain.html.includes(marker));
    const bustedMissingRequired = requiredMarkers.filter((marker) => !busted.html.includes(marker));
    const plainBlockedPhrases = blockedPhrases.filter((phrase) => plain.html.includes(phrase));
    const bustedBlockedPhrases = blockedPhrases.filter((phrase) => busted.html.includes(phrase));
    const plainGenericNarrative = genericNarrativePhrases.filter((phrase) =>
      plainText.toLowerCase().includes(phrase)
    );
    const bustedGenericNarrative = genericNarrativePhrases.filter((phrase) =>
      bustedText.toLowerCase().includes(phrase)
    );
    const plainDecisionHeadingCount = countMatches(plainText, /\bDecision in 60 Seconds\b/gi);
    const bustedDecisionHeadingCount = countMatches(bustedText, /\bDecision in 60 Seconds\b/gi);
    const plainQuickJumpCount = countMatches(plain.html, />\s*Quick jump\s*</gi);
    const bustedQuickJumpCount = countMatches(busted.html, />\s*Quick jump\s*</gi);
    const plainReaderControlsCount = countMatches(
      plain.html,
      /<h[1-6][^>]*>\s*Reader controls\s*<\/h[1-6]>/gi
    );
    const bustedReaderControlsCount = countMatches(
      busted.html,
      /<h[1-6][^>]*>\s*Reader controls\s*<\/h[1-6]>/gi
    );
    const plainContradictoryFreePlan =
      positiveFreeSignalPattern.test(plainText) && contradictoryFreePlanPattern.test(plainText);
    const bustedContradictoryFreePlan =
      positiveFreeSignalPattern.test(bustedText) && contradictoryFreePlanPattern.test(bustedText);
    const plainContradictoryPlatform =
      nonWebPlatformPattern.test(plainText) && webOnlyPattern.test(plainText);
    const bustedContradictoryPlatform =
      nonWebPlatformPattern.test(bustedText) && webOnlyPattern.test(bustedText);
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
    if (plainGenericNarrative.length > 0 || bustedGenericNarrative.length > 0) {
      console.log(
        `generic narrative phrases found: plain=[${plainGenericNarrative.join(', ')}] bust=[${bustedGenericNarrative.join(', ')}]`
      );
      if (debugSnippets) {
        for (const phrase of plainGenericNarrative) {
          const snippet = snippetAround(plainText, phrase);
          if (snippet) {
            console.log(`  plain snippet (${phrase}): ${snippet}`);
          }
        }
        for (const phrase of bustedGenericNarrative) {
          const snippet = snippetAround(bustedText, phrase);
          if (snippet) {
            console.log(`  bust snippet (${phrase}): ${snippet}`);
          }
        }
      }
    }
    if (plainDecisionHeadingCount !== 1 || bustedDecisionHeadingCount !== 1) {
      console.log(
        `decision heading count mismatch: plain=${plainDecisionHeadingCount} bust=${bustedDecisionHeadingCount}`
      );
    }
    if (plainQuickJumpCount > 1 || bustedQuickJumpCount > 1) {
      console.log(`quick jump duplicated: plain=${plainQuickJumpCount} bust=${bustedQuickJumpCount}`);
    }
    if (plainReaderControlsCount > 1 || bustedReaderControlsCount > 1) {
      console.log(
        `reader controls duplicated: plain=${plainReaderControlsCount} bust=${bustedReaderControlsCount}`
      );
    }
    if (plainContradictoryFreePlan || bustedContradictoryFreePlan) {
      console.log(
        `contradictory free-plan claims: plain=${plainContradictoryFreePlan} bust=${bustedContradictoryFreePlan}`
      );
      if (debugSnippets) {
        const freePhrase =
          'no free tier or free trial is currently available based on verified platform data';
        const snippetPlain = snippetAround(plainText, freePhrase);
        const snippetBust = snippetAround(bustedText, freePhrase);
        if (snippetPlain) console.log(`  plain snippet (no-free claim): ${snippetPlain}`);
        if (snippetBust) console.log(`  bust snippet (no-free claim): ${snippetBust}`);
      }
    }
    if (plainContradictoryPlatform || bustedContradictoryPlatform) {
      console.log(
        `contradictory platform claims: plain=${plainContradictoryPlatform} bust=${bustedContradictoryPlatform}`
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
      plainGenericNarrative.length > 0 ||
      bustedGenericNarrative.length > 0 ||
      plainDecisionHeadingCount !== 1 ||
      bustedDecisionHeadingCount !== 1 ||
      plainQuickJumpCount > 1 ||
      bustedQuickJumpCount > 1 ||
      plainReaderControlsCount > 1 ||
      bustedReaderControlsCount > 1 ||
      plainContradictoryFreePlan ||
      bustedContradictoryFreePlan ||
      plainContradictoryPlatform ||
      bustedContradictoryPlatform ||
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
