import { expect, test, type Page } from '@playwright/test';

type RouteCase = {
  name: string;
  path?: string;
  resolvePath?: (page: Page) => Promise<string>;
  requiredSchemaTypes?: string[];
  checkInternalLinks?: boolean;
  internalLinkBudget?: number;
};

const ROUTES: RouteCase[] = [
  {
    name: 'Home',
    path: '/',
    requiredSchemaTypes: ['Organization', 'WebSite'],
    internalLinkBudget: 4,
  },
  { name: 'Tool page', resolvePath: resolveToolPath, checkInternalLinks: false },
  { name: 'Tools index', path: '/tools', checkInternalLinks: false },
  { name: 'Categories index', path: '/categories', checkInternalLinks: false },
  { name: 'Methodology', path: '/methodology', internalLinkBudget: 3 },
];

const OG_TAGS = ['og:title', 'og:description', 'og:url'];
const MAX_INTERNAL_LINK_CHECKS = 4;
const INTERNAL_LINK_TIMEOUT_MS = 8000;

function normalizePathname(value: string): string {
  if (!value) return '/';
  const [withoutQuery] = value.split(/[?#]/);
  if (!withoutQuery || withoutQuery === '') return '/';
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) return withoutQuery.slice(0, -1);
  return withoutQuery;
}

function isPublicInternalLink(href: string): boolean {
  if (!href.startsWith('/')) return false;
  if (href.startsWith('//')) return false;
  if (href.startsWith('/admin')) return false;
  if (href.startsWith('/api')) return false;
  return true;
}

function collectSchemaTypes(payload: unknown, output: Set<string>): void {
  if (Array.isArray(payload)) {
    for (const entry of payload) collectSchemaTypes(entry, output);
    return;
  }

  if (!payload || typeof payload !== 'object') return;
  const value = payload as Record<string, unknown>;
  const maybeType = value['@type'];

  if (typeof maybeType === 'string') output.add(maybeType);
  if (Array.isArray(maybeType)) {
    for (const item of maybeType) {
      if (typeof item === 'string') output.add(item);
    }
  }

  if ('@graph' in value) collectSchemaTypes(value['@graph'], output);
}

async function resolveToolPath(page: Page): Promise<string> {
  const directCandidates = ['/tool/perplexity?v=4', '/tool/perplexity'];

  for (const path of directCandidates) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 400) continue;
    if (normalizePathname(new URL(page.url()).pathname).startsWith('/tool/')) return path;
  }

  const toolsResponse = await page.goto('/tools', { waitUntil: 'domcontentloaded' });
  if (toolsResponse?.status() && toolsResponse.status() < 400) {
    const href = await page.locator('main a[href^="/tool/"]').first().getAttribute('href');
    if (href) return href;
  }

  return '/tool/perplexity?v=4';
}

async function assertSeoBasics(route: RouteCase, path: string, page: Page) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), `${route.name} should return a successful page response`).toBeLessThan(
    400
  );

  const h1Count = await page.locator('h1:visible').count();
  expect(h1Count, `${route.name} should have exactly one visible h1`).toBe(1);

  await expect(page, `${route.name} should define a non-empty <title>`).toHaveTitle(/\S+/);

  const description =
    (await page.locator('meta[name="description"]').first().getAttribute('content')) ?? '';
  const descriptionLength = description.trim().length;
  expect(
    descriptionLength,
    `${route.name} should have a description between 50 and 160 chars`
  ).toBeGreaterThanOrEqual(50);
  expect(
    descriptionLength,
    `${route.name} should have a description between 50 and 160 chars`
  ).toBeLessThanOrEqual(160);

  const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
  expect(canonical, `${route.name} should expose a canonical URL`).toBeTruthy();
  const canonicalPath = canonical
    ? /^https?:\/\//i.test(canonical)
      ? normalizePathname(new URL(canonical).pathname)
      : normalizePathname(canonical)
    : '';

  if (canonical && /^https?:\/\//i.test(canonical)) {
    const canonicalUrl = new URL(canonical);
    const currentUrl = new URL(page.url());
    if (route.name === 'Tool page') {
      expect(
        normalizePathname(canonicalUrl.pathname).startsWith('/tool/') ||
          normalizePathname(canonicalUrl.pathname) === '/tools',
        `${route.name} canonical should point to a tool route or /tools fallback`
      ).toBeTruthy();
    } else {
      expect(normalizePathname(canonicalUrl.pathname)).toBe(normalizePathname(currentUrl.pathname));
    }
  } else {
    expect(
      canonical?.startsWith('/'),
      `${route.name} canonical should be absolute URL or absolute path`
    ).toBeTruthy();
  }

  for (const property of OG_TAGS) {
    const value = await page
      .locator(`meta[property="${property}"]`)
      .first()
      .getAttribute('content');
    expect(value?.trim().length ?? 0, `${route.name} should include ${property}`).toBeGreaterThan(
      0
    );
  }

  const robots = (
    await page.locator('meta[name="robots"]').first().getAttribute('content')
  )?.toLowerCase();
  const allowsNoindexFallback = route.name === 'Tool page' && canonicalPath === '/tools';
  if (!allowsNoindexFallback) {
    expect(robots ?? '', `${route.name} should not be noindex`).not.toContain('noindex');
  }

  const jsonLdScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLdScripts.length, `${route.name} should include JSON-LD`).toBeGreaterThan(0);

  const schemaTypes = new Set<string>();
  for (const [index, rawJson] of jsonLdScripts.entries()) {
    const source = rawJson.trim();
    expect(
      source.length,
      `${route.name} JSON-LD script #${index + 1} should not be empty`
    ).toBeGreaterThan(0);
    let parsed: unknown;
    expect(
      () => {
        parsed = JSON.parse(source);
      },
      `${route.name} JSON-LD script #${index + 1} should be valid JSON`
    ).not.toThrow();
    collectSchemaTypes(parsed, schemaTypes);
  }

  for (const schemaType of route.requiredSchemaTypes ?? []) {
    expect(
      schemaTypes.has(schemaType),
      `${route.name} should expose schema type ${schemaType}`
    ).toBeTruthy();
  }

  if (route.checkInternalLinks !== false) {
    const internalLinks = await page
      .locator('main a[href]')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node as HTMLAnchorElement).getAttribute('href') || '')
          .filter((href) => href.length > 0)
      );

    const budget = route.internalLinkBudget ?? MAX_INTERNAL_LINK_CHECKS;
    const uniquePublicLinks = Array.from(
      new Set(
        internalLinks
          .map((href) => href.split('#')[0])
          .filter((href) => href.length > 0 && isPublicInternalLink(href))
      )
    ).slice(0, budget);

    for (const href of uniquePublicLinks) {
      const linkResponse = await page.request.get(href, {
        maxRedirects: 5,
        timeout: INTERNAL_LINK_TIMEOUT_MS,
      });
      expect(
        linkResponse.status(),
        `${route.name} contains a broken internal link: ${href}`
      ).toBeLessThan(400);
    }
  }
}

test.describe('SEO smoke checks', () => {
  for (const route of ROUTES) {
    test(`${route.name} has baseline SEO metadata`, async ({ page }) => {
      const path = route.resolvePath ? await route.resolvePath(page) : route.path;
      if (!path) throw new Error(`No route path configured for ${route.name}`);
      await assertSeoBasics(route, path, page);
    });
  }
});
