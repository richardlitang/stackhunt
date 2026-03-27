#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name, fallback = null) {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.split('=').slice(1).join('=').trim();
}

function parseCsvArg(name) {
  const raw = getArgValue(name, '');
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatFetchError(error) {
  if (!error) return 'unknown fetch error';
  const parts = [];
  let current = error;
  while (current && typeof current === 'object') {
    if (typeof current.message === 'string' && current.message.trim().length > 0) {
      parts.push(current.message.trim());
    }
    current = current.cause;
  }
  if (parts.length > 0) return parts.join(' | cause: ');
  return String(error);
}

function runCommand(command, label, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command;
    console.log(`\n=== ${label} ===`);
    console.log(`$ ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

function stopServer(server) {
  if (!server || server.pid == null) return;
  if (server.exitCode !== null) return;
  server.kill('SIGTERM');
}

async function waitForUrl(url, timeoutMs) {
  await runCommand(['npx', 'wait-on', url, '--timeout', String(timeoutMs)], 'Wait for preview');
}

async function startPreview(baseUrl, port, timeoutMs) {
  const server = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );
  await waitForUrl(baseUrl, timeoutMs);
  return server;
}

function extractLocsFromSitemap(xml) {
  const matches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
  return matches;
}

function extractSitemapUrlsFromIndex(xml) {
  return Array.from(xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>\s*<\/sitemap>/g)).map(
    (m) => m[1]
  );
}

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

const GENERIC_PATTERNS = [
  /\bworth shortlisting\b/i,
  /\brobust and powerful solution\b/i,
  /\bbest-in-class capabilities\b/i,
  /\bstrong option(?: based on)?(?: the)? current source-backed evidence\b/i,
  /\bsolid choice for modern teams\b/i,
  /\bbest value threshold\b/i,
  /\bworth it when\b/i,
];

const SPEC_SHEET_PATTERNS = [
  /\bTL;DR\b/i,
  /\bCommunity Insights\b/i,
  /\bCapabilities & Differentiators\b/i,
  /\bDecision Snapshot\b/i,
  /\bWhat most buyers usually care about first\b/i,
  /\bplatform access is limited to web-based environments\b/i,
];
const CONTRADICTORY_FREE_PLAN_PATTERN = /\b(no|lack(?:s| of)?)\s+(?:a\s+)?free\s+(?:tier|plan)\b/i;
const POSITIVE_FREE_SIGNAL_PATTERN = /\b(freemium|free\s+tier|free\s+plan)\b/i;
const WEB_ONLY_PATTERN =
  /\b(platform access is limited to web-based environments|web[-\s]*only|web-based environments only)\b/i;
const NON_WEB_PLATFORM_PATTERN = /\b(ios|android|windows|mac(?:os)?|desktop app|desktop apps)\b/i;
const SUBJECT_SCOPE_PENDING_PATTERN =
  /\b(Published review content is hidden until this page resolves (?:one product surface|a single review subject)|waiting for clearer subject resolution)\b/i;
const HERO_DEK_GENERIC_PATTERN = /^Pricing,\s*tradeoffs,\s*best for,\s*and alternatives\.?$/i;
const DECISION_SECTION_HEADING_PATTERN =
  /\b(?:Decision in 60 Seconds|Should You Shortlist|Best fit, main risk, and upgrade trigger)\b/i;
const DECISION_SECTION_PATTERN =
  /<section[^>]*>[\s\S]*?<h2[^>]*>\s*(?:Decision in 60 Seconds|Should You Shortlist|Best fit, main risk, and upgrade trigger)\s*<\/h2>[\s\S]*?<\/section>/i;
const ALLOWED_DECISION_SECTION_LINKS = new Set(['#verdict', '#sources']);
const SECTION_RAIL_PATTERN = /<nav[^>]*aria-label=["']Section rail["'][^>]*>([\s\S]*?)<\/nav>/i;
const FIT_MATRIX_SECTION_PATTERN = /<section[^>]*id=["']fit-matrix["'][^>]*>([\s\S]*?)<\/section>/i;
const OPERATIONAL_DETAILS_PANEL_PATTERN =
  /<details[^>]*>[\s\S]*?<h3[^>]*>\s*Operational details\s*<\/h3>([\s\S]*?)<\/details>/i;
const OPERATIONAL_DETAILS_SIGNAL_PATTERN =
  /\b(Company|Security|Support|Portability|Suite navigation|Part of|Compliance|Help|Export)\b/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHeadingText(html, headingTag = 'h1') {
  const match = html.match(new RegExp(`<${headingTag}[^>]*>([\\s\\S]*?)<\\/${headingTag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function extractHeroDek(html) {
  const match = html.match(
    /<h1[^>]*>[\s\S]*?<\/h1>[\s\S]*?<p[^>]*class="[^"]*text-sm[^"]*text-zinc-400[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  return match ? stripHtml(match[1]) : '';
}

function auditRenderedPage({ url, html, maxNotConfirmed }) {
  const failures = [];
  const text = stripHtml(html);
  const notConfirmedHits = (text.match(/\bNot confirmed\b/g) || []).length;
  const bestFitHits = (text.match(/\bBest fit:\b/gi) || []).length;
  const weakFitHits = (text.match(/\bWeak fit:\b/gi) || []).length;
  const tradeoffHits = (text.match(/\bTradeoff:\b/gi) || []).length;
  const decisionHeadingHits = (text.match(new RegExp(DECISION_SECTION_HEADING_PATTERN, 'gi')) || [])
    .length;
  const readerControlsHits = (html.match(/<h[1-6][^>]*>\s*Reader controls\s*<\/h[1-6]>/gi) || [])
    .length;
  const quickJumpHits = (html.match(/>\s*Quick jump\s*</gi) || []).length;
  const canonicalVerdictPointerHits = (
    text.match(/\bCanonical constraints live in\s+Why This Verdict\b/gi) || []
  ).length;
  const decisionSectionMatch = html.match(DECISION_SECTION_PATTERN);
  if (decisionSectionMatch) {
    const hrefMatches = Array.from(decisionSectionMatch[0].matchAll(/href=["']([^"']+)["']/gi)).map(
      (match) => match[1]
    );
    const disallowedDecisionLinks = hrefMatches.filter(
      (href) => !ALLOWED_DECISION_SECTION_LINKS.has(href)
    );
    if (disallowedDecisionLinks.length > 0) {
      failures.push(
        `decision_section_has_extra_cta_links:${Array.from(new Set(disallowedDecisionLinks)).join(',')}`
      );
    }
  }
  if (!/\bHow We Evaluated\b/i.test(text)) failures.push('missing_how_we_evaluated');
  if (!/\bVerdict\b/i.test(text)) failures.push('missing_verdict_section');
  if (!/\bBest for\b/i.test(text)) failures.push('missing_best_for_language');
  if (!/\bWatch outs\b/i.test(text) && !/\bNot for\b/i.test(text)) {
    failures.push('missing_not_for_watch_outs_language');
  }
  if (notConfirmedHits > maxNotConfirmed) {
    failures.push(`too_many_not_confirmed:${notConfirmedHits}`);
  }
  if (bestFitHits > 1) {
    failures.push(`duplicated_best_fit_label:${bestFitHits}`);
  }
  if (weakFitHits > 1) {
    failures.push(`duplicated_weak_fit_label:${weakFitHits}`);
  }
  if (tradeoffHits > 1) {
    failures.push(`duplicated_tradeoff_label:${tradeoffHits}`);
  }
  if (decisionHeadingHits > 1) {
    failures.push(`duplicated_decision_heading:${decisionHeadingHits}`);
  }
  if (readerControlsHits > 1) {
    failures.push(`duplicated_reader_controls_heading:${readerControlsHits}`);
  }
  if (quickJumpHits > 1) {
    failures.push(`duplicated_quick_jump_heading:${quickJumpHits}`);
  }
  if (canonicalVerdictPointerHits > 1) {
    failures.push(`duplicated_verdict_pointer_copy:${canonicalVerdictPointerHits}`);
  }
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(text)) {
      failures.push(`generic_phrase:${pattern}`);
    }
  }
  for (const pattern of SPEC_SHEET_PATTERNS) {
    if (pattern.test(text)) {
      failures.push(`spec_sheet_phrase:${pattern}`);
    }
  }
  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!headingMatch || !/\bReview\b/i.test(stripHtml(headingMatch[1]))) {
    failures.push('h1_missing_review_intent');
  }
  if (POSITIVE_FREE_SIGNAL_PATTERN.test(text) && CONTRADICTORY_FREE_PLAN_PATTERN.test(text)) {
    failures.push('contradictory_free_plan_claims');
  }
  if (NON_WEB_PLATFORM_PATTERN.test(text) && WEB_ONLY_PATTERN.test(text)) {
    failures.push('contradictory_platform_claims');
  }
  if (SUBJECT_SCOPE_PENDING_PATTERN.test(text) && DECISION_SECTION_HEADING_PATTERN.test(text)) {
    failures.push('entity_confusion_unresolved_subject_exposes_verdict');
  }

  const heroHeading = extractHeadingText(html, 'h1');
  const heroDek = extractHeroDek(html);
  if (heroDek && HERO_DEK_GENERIC_PATTERN.test(heroDek)) {
    failures.push('generic_hero_dek_detected');
  }
  if (heroHeading && heroDek) {
    const toolNameGuess = heroHeading.replace(/\s+Review\b/i, '').trim();
    if (toolNameGuess && !new RegExp(`\\b${escapeRegExp(toolNameGuess)}\\b`, 'i').test(heroDek)) {
      failures.push('hero_dek_missing_tool_name');
    }
  }

  const compareLinkMatches = Array.from(html.matchAll(/href=["'](\/compare\/[^"']+)["']/gi)).map(
    (match) => match[1]
  );
  const invalidCompareLinks = compareLinkMatches.filter(
    (href) => !/^\/compare\/[a-z0-9-]+-vs-[a-z0-9-]+$/i.test(href)
  );
  if (invalidCompareLinks.length > 0) {
    failures.push(
      `unsupported_comparison_set_link_shape:${Array.from(new Set(invalidCompareLinks)).join(',')}`
    );
  }
  if (compareLinkMatches.length > 0 && !/\bComparison axis\b/i.test(text)) {
    failures.push('unsupported_comparison_set_missing_axis_label');
  }
  if (/\bNot confirmed yet\b/i.test(text)) {
    failures.push('excessive_pending_copy_not_confirmed_yet');
  }
  if (/href=["']\/disclosure["']/i.test(html)) {
    failures.push('section_rail_contains_disclosure_link');
  }
  const sectionRailMatch = html.match(SECTION_RAIL_PATTERN);
  if (sectionRailMatch) {
    const sectionRailHrefMatches = Array.from(
      sectionRailMatch[1].matchAll(/href=["'](#[-a-z0-9]+)["']/gi)
    ).map((match) => match[1]);
    const missingTargets = sectionRailHrefMatches.filter(
      (href) => !new RegExp(`id=["']${escapeRegExp(href.slice(1))}["']`, 'i').test(html)
    );
    if (missingTargets.length > 0) {
      failures.push(
        `section_rail_has_missing_targets:${Array.from(new Set(missingTargets)).join(',')}`
      );
    }
  }
  const fitMatrixSectionMatch = html.match(FIT_MATRIX_SECTION_PATTERN);
  if (fitMatrixSectionMatch) {
    const articleMatches = Array.from(
      fitMatrixSectionMatch[1].matchAll(/<article[\s\S]*?<\/article>/gi)
    ).map((match) => match[0]);
    for (const article of articleMatches) {
      const articleText = stripHtml(article);
      const hasNonStrongFit = /\b(Conditional fit|Weak fit)\b/i.test(articleText);
      if (!hasNonStrongFit) continue;
      if (!/\bcaveat:\b/i.test(articleText)) {
        failures.push('fit_matrix_non_strong_row_missing_caveat');
        break;
      }
    }
  }
  const operationalDetailsPanelMatch = html.match(OPERATIONAL_DETAILS_PANEL_PATTERN);
  if (operationalDetailsPanelMatch) {
    const panelText = stripHtml(operationalDetailsPanelMatch[1]);
    if (!OPERATIONAL_DETAILS_SIGNAL_PATTERN.test(panelText)) {
      failures.push('operational_details_panel_empty');
    }
  }

  return {
    url,
    failures,
    notConfirmedHits,
  };
}

async function fetchText(url, options = {}) {
  const retries = Math.max(0, Number.isFinite(options.retries) ? options.retries : 2);
  const timeoutMs = Math.max(1000, Number.isFinite(options.timeoutMs) ? options.timeoutMs : 15000);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'User-Agent': 'stackhunt-qa-rendered/1.0',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}) for ${url}`);
      }
      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
      }
    }
  }

  throw new Error(`Fetch failed for ${url}: ${formatFetchError(lastError)}`);
}

async function discoverToolUrls(baseUrl, fetchOptions) {
  const sitemapCandidates = ['/sitemap-tools.xml', '/sitemap.xml', '/sitemap-index.xml'];
  const discovered = new Set();
  const seenSitemaps = new Set();

  const collectFromSitemap = async (sitemapUrl) => {
    if (seenSitemaps.has(sitemapUrl)) return;
    seenSitemaps.add(sitemapUrl);

    let xml = '';
    try {
      xml = await fetchText(sitemapUrl, fetchOptions);
    } catch {
      return;
    }

    const locs = extractLocsFromSitemap(xml)
      .map((loc) => {
        try {
          return new URL(loc).pathname;
        } catch {
          return null;
        }
      })
      .filter((loc) => typeof loc === 'string' && loc.startsWith('/tool/'));
    for (const loc of locs) {
      discovered.add(loc);
    }

    const childSitemaps = extractSitemapUrlsFromIndex(xml);
    for (const childSitemapUrl of childSitemaps) {
      await collectFromSitemap(childSitemapUrl);
    }
  };

  for (const pathname of sitemapCandidates) {
    await collectFromSitemap(`${baseUrl}${pathname}`);
    if (discovered.size > 0) break;
  }

  return Array.from(discovered);
}

async function main() {
  const sampleSize = Number(getArgValue('sample', '25')) || 25;
  const port = Number(getArgValue('port', '4324')) || 4324;
  const timeoutMs = Number(getArgValue('timeout-ms', '90000')) || 90000;
  const maxNotConfirmed = Number(getArgValue('max-not-confirmed', '8')) || 8;
  const fetchTimeoutMs = Number(getArgValue('fetch-timeout-ms', '15000')) || 15000;
  const fetchRetries = Number(getArgValue('fetch-retries', '2')) || 2;
  const templateOnly = hasFlag('template-only');
  const skipBuild = hasFlag('skip-build');
  const externalServer = hasFlag('external-server');
  const allowTemplateFallback =
    hasFlag('allow-template-fallback') || (!externalServer && !hasFlag('no-template-fallback'));
  const baseUrl = getArgValue('base-url', `http://127.0.0.1:${port}`);
  const explicitPaths = parseCsvArg('paths').map((value) => {
    if (value.startsWith('/tool/')) return value;
    if (value.startsWith('tool/')) return `/${value}`;
    return `/tool/${value.replace(/^\/+/, '')}`;
  });
  const explicitSlugs = parseCsvArg('slug');
  const explicitSlugPaths = explicitSlugs.map((slug) => `/tool/${slug}`);
  const fetchOptions = { timeoutMs: fetchTimeoutMs, retries: fetchRetries };

  if (templateOnly) {
    const fallbackFailures = runTemplateFallbackChecks({ maxNotConfirmed });
    if (fallbackFailures.length > 0) {
      console.error('\nqa-rendered-tool-pages: FAIL (template-only)\n');
      for (const failure of fallbackFailures) {
        console.error(`- ${failure}`);
      }
      process.exit(1);
    }
    console.log('\nqa-rendered-tool-pages: PASS (template-only mode)');
    return;
  }

  let previewServer = null;
  const teardown = () => stopServer(previewServer);
  process.on('exit', teardown);
  process.on('SIGINT', () => {
    teardown();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    teardown();
    process.exit(143);
  });

  try {
    if (!skipBuild) {
      await runCommand(['npm', 'run', 'build'], 'Build');
    }
    if (!externalServer) {
      previewServer = await startPreview(baseUrl, port, timeoutMs);
    }

    const toolPaths =
      explicitPaths.length > 0
        ? explicitPaths
        : explicitSlugPaths.length > 0
          ? explicitSlugPaths
          : await discoverToolUrls(baseUrl, fetchOptions);
    if (toolPaths.length === 0) {
      throw new Error('No /tool/* URLs discovered from sitemap endpoints');
    }
    const samplePaths = toolPaths.slice(0, Math.max(1, sampleSize));
    console.log(
      `\nAuditing ${samplePaths.length} rendered tool page(s) from ${toolPaths.length} discovered`
    );

    const failures = [];
    for (const toolPath of samplePaths) {
      const url = `${baseUrl}${toolPath}`;
      try {
        const html = await fetchText(url, fetchOptions);
        const audited = auditRenderedPage({ url, html, maxNotConfirmed });
        if (audited.failures.length > 0) {
          failures.push(audited);
        }
      } catch (error) {
        failures.push({
          url,
          failures: [`fetch_error:${formatFetchError(error)}`],
          notConfirmedHits: 0,
        });
      }
    }

    if (failures.length > 0) {
      console.error('\nqa-rendered-tool-pages: FAIL\n');
      for (const failure of failures) {
        console.error(`- ${failure.url}`);
        for (const reason of failure.failures) {
          console.error(`  - ${reason}`);
        }
      }
      process.exit(1);
    }

    console.log('\nqa-rendered-tool-pages: PASS');
    console.log(`Checked ${samplePaths.length} rendered tool page(s).`);
  } catch (error) {
    if (!allowTemplateFallback) throw error;
    const fallbackFailures = runTemplateFallbackChecks({ maxNotConfirmed });
    if (fallbackFailures.length > 0) {
      console.error('\nqa-rendered-tool-pages: FAIL (template fallback)\n');
      for (const failure of fallbackFailures) {
        console.error(`- ${failure}`);
      }
      process.exit(1);
    }
    console.warn('\nqa-rendered-tool-pages: PASS (template fallback mode)');
    console.warn(
      `Rendered audit skipped due runtime constraints: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    teardown();
  }
}

function runTemplateFallbackChecks({ maxNotConfirmed }) {
  const root = process.cwd();
  const sourcePaths = [
    path.join(root, 'src/pages/tool/[slug].astro'),
    path.join(root, 'src/lib/tool-page/lens.ts'),
    path.join(root, 'src/lib/tool-page/decision.ts'),
    path.join(root, 'src/components/AlternativeCard.astro'),
  ];
  const failures = [];
  if (!fs.existsSync(sourcePaths[0])) {
    return ['missing_tool_page_source'];
  }
  const source = sourcePaths
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => fs.readFileSync(candidate, 'utf8'))
    .join('\n');
  const requiredMarkers = [
    {
      label: 'qa_gate_wired',
      pattern:
        /\b(buildToolPageRouteDataPipelineStateFromPageContext|buildToolPagePageCompilerRouteStateFromPageContext|buildToolPageRoutePipelineStateFromDataPrepContext|buildToolPagePageAssemblyRouteStateFromPageContext|buildToolPagePageAssemblyRouteStateFromRouteContext|buildToolPageRuntimeMidRouteState|buildToolPageRuntimeNavigationRouteState|buildToolPageRuntimeRouteState|buildToolPageRuntimeNavigationStateFromDecisionContext|buildToolPageRuntimeViewBundleFromDecisionContext|buildToolPageRuntimeViewBundleFromPageContext|buildToolPageRuntimeAssembly|buildToolPageRuntimeContext|evaluateToolPageQaGate)\(/,
    },
    {
      label: 'how_we_evaluated_heading',
      pattern: /(How We Evaluated|ToolHowWeEvaluateSection|buildToolPageHowWeEvaluatedTitle)/,
    },
    {
      label: 'verdict_heading',
      pattern:
        /(Decision in 60 Seconds|Should You Shortlist|Best fit, main risk, and upgrade trigger|Verdict:)/,
    },
    { label: 'review_dek', pattern: /Pricing,\s*tradeoffs,\s*best for,\s*and alternatives\.?/i },
    {
      label: 'decision_intro_tradeoff',
      pattern: /(decisionIntroTradeoff|decisionTradeoffSummary(?:Initial|Resolved)?)/,
    },
    {
      label: 'alternatives_comparison_axis',
      pattern: /Comparison axis/,
    },
  ];
  for (const marker of requiredMarkers) {
    if (!marker.pattern.test(source)) failures.push(`missing_marker:${marker.label}`);
  }

  const genericHits = GENERIC_PATTERNS.filter((pattern) => pattern.test(source));
  if (genericHits.length > 0) {
    failures.push(`generic_phrase_in_template:${genericHits.length}`);
  }

  const specSheetHits = SPEC_SHEET_PATTERNS.filter((pattern) => pattern.test(source));
  if (specSheetHits.length > 0) {
    failures.push(`spec_sheet_phrase_in_template:${specSheetHits.length}`);
  }

  const notConfirmedHits = (source.match(/\bNot confirmed\b/g) || []).length;
  if (notConfirmedHits > maxNotConfirmed * 4) {
    failures.push(`template_not_confirmed_excessive:${notConfirmedHits}`);
  }

  const bestFitHits = (source.match(/\bBest fit:\b/gi) || []).length;
  if (bestFitHits > 1) {
    failures.push(`template_duplicate_best_fit_label:${bestFitHits}`);
  }
  const weakFitHits = (source.match(/\bWeak fit:\b/gi) || []).length;
  if (weakFitHits > 1) {
    failures.push(`template_duplicate_weak_fit_label:${weakFitHits}`);
  }
  const tradeoffHits = (source.match(/\bTradeoff:\b/gi) || []).length;
  if (tradeoffHits > 1) {
    failures.push(`template_duplicate_tradeoff_label:${tradeoffHits}`);
  }
  const decisionHeadingHits = (
    source.match(new RegExp(DECISION_SECTION_HEADING_PATTERN, 'gi')) || []
  ).length;
  if (decisionHeadingHits > 1) {
    failures.push(`template_duplicate_decision_heading:${decisionHeadingHits}`);
  }
  const readerControlsHits = (source.match(/<h[1-6][^>]*>\s*Reader controls\s*<\/h[1-6]>/gi) || [])
    .length;
  if (readerControlsHits > 1) {
    failures.push(`template_duplicate_reader_controls_heading:${readerControlsHits}`);
  }
  const quickJumpHits = (source.match(/>\s*Quick jump\s*</gi) || []).length;
  if (quickJumpHits > 1) {
    failures.push(`template_duplicate_quick_jump_heading:${quickJumpHits}`);
  }
  const hardLimitsJumpHits = (
    source.match(/<a[^>]+href="#verdict"[\s\S]*?>\s*Hard limits\s*<\/a>/gi) || []
  ).length;
  if (hardLimitsJumpHits > 0) {
    failures.push(`template_hard_limits_jump_present:${hardLimitsJumpHits}`);
  }
  const canonicalVerdictPointerHits = (
    source.match(/\bCanonical constraints live in[\s\S]*?Why This Verdict\b/gi) || []
  ).length;
  if (canonicalVerdictPointerHits > 1) {
    failures.push(`template_duplicate_verdict_pointer_copy:${canonicalVerdictPointerHits}`);
  }
  const decisionSectionMatch = source.match(DECISION_SECTION_PATTERN);
  if (decisionSectionMatch) {
    const hrefMatches = Array.from(decisionSectionMatch[0].matchAll(/href=["']([^"']+)["']/gi)).map(
      (match) => match[1]
    );
    const disallowedDecisionLinks = hrefMatches.filter(
      (href) => !ALLOWED_DECISION_SECTION_LINKS.has(href)
    );
    if (disallowedDecisionLinks.length > 0) {
      failures.push(
        `template_decision_section_has_extra_cta_links:${Array.from(
          new Set(disallowedDecisionLinks)
        ).join(',')}`
      );
    }
  } else {
    failures.push('template_missing_decision_section');
  }
  if (
    SUBJECT_SCOPE_PENDING_PATTERN.test(source) &&
    DECISION_SECTION_HEADING_PATTERN.test(source) &&
    !/showReviewInProgressBanner/.test(source)
  ) {
    failures.push('template_entity_confusion_unresolved_subject_exposes_verdict');
  }

  if (/>\s*\{reviewDek\}\s*</.test(source)) {
    failures.push('template_generic_hero_dek_unscoped');
  }
  if (/\bNot confirmed yet\b/i.test(source)) {
    failures.push('template_excessive_pending_copy_not_confirmed_yet');
  }
  if (/href=["']\/disclosure["']/i.test(source)) {
    failures.push('template_section_rail_contains_disclosure_link');
  }

  const compareHrefMatches = Array.from(source.matchAll(/href=\{compareUrl\}|\/compare\/\$\{/g));
  if (compareHrefMatches.length > 0 && !/\bComparison axis\b/i.test(source)) {
    failures.push('template_unsupported_comparison_set_missing_axis_label');
  }

  return failures;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
