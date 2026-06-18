import { expect, test, type Page } from '@playwright/test';

const MAX_LINK_CANDIDATES = 12;

function normalizeInternalHref(href: string | null): string | null {
  if (!href) return null;
  if (!href.startsWith('/')) return null;
  if (href.startsWith('//')) return null;
  if (href.startsWith('/api')) return null;
  if (href.startsWith('/admin')) return null;
  return href.split('#')[0];
}

async function pickReachablePath(
  page: Page,
  discoveryPaths: string[],
  selector: string,
  expectedPrefix: string,
  isValidPath?: (path: string) => boolean
): Promise<string | null> {
  const seen = new Set<string>();

  for (const discoveryPath of discoveryPaths) {
    const discoveryResponse = await page.goto(discoveryPath, { waitUntil: 'domcontentloaded' });
    if ((discoveryResponse?.status() ?? 500) >= 400) continue;

    const hrefs = await page
      .locator(selector)
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node as HTMLAnchorElement).getAttribute('href'))
          .filter((href): href is string => Boolean(href))
      );

    for (const href of hrefs.slice(0, MAX_LINK_CANDIDATES)) {
      const normalized = normalizeInternalHref(href);
      if (!normalized) continue;
      if (!normalized.startsWith(expectedPrefix)) continue;
      if (isValidPath && !isValidPath(normalized)) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const response = await page.goto(normalized, { waitUntil: 'domcontentloaded' });
      const pathname = new URL(page.url()).pathname;
      if ((response?.status() ?? 500) < 400 && pathname.startsWith(expectedPrefix)) {
        return normalized;
      }
    }
  }

  return null;
}

test.describe('Primary public navigation flow', () => {
  test.describe.configure({ timeout: 120_000 });

  test('home -> category -> best -> tool -> compare', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/StackHunt/i);

    const categoryPath =
      (await pickReachablePath(page, ['/'], 'a[href^="/categories/"]', '/categories/', (path) =>
        /^\/categories\/[a-z0-9-]+$/i.test(path)
      )) ??
      (await pickReachablePath(
        page,
        ['/categories'],
        'main a[href^="/categories/"]',
        '/categories/',
        (path) => /^\/categories\/[a-z0-9-]+$/i.test(path)
      ));
    expect(categoryPath, 'Expected at least one category detail path to be reachable').toBeTruthy();
    await expect(page).toHaveURL(/\/categories\//);
    await expect(page.locator('h1:visible').first()).toBeVisible();

    const bestPath = await pickReachablePath(
      page,
      [categoryPath as string, '/best', '/'],
      'a[href^="/best/"]',
      '/best/'
    );
    expect(bestPath, 'Expected at least one best/context detail path to be reachable').toBeTruthy();
    await expect(page).toHaveURL(/\/best\//);
    await expect(page.locator('h1:visible').first()).toBeVisible();

    const toolPath = await pickReachablePath(
      page,
      [bestPath as string, '/tools'],
      'a[href^="/tool/"]',
      '/tool/'
    );
    expect(toolPath, 'Expected at least one tool detail path to be reachable').toBeTruthy();
    await expect(page).toHaveURL(/\/tool\//);
    await expect(page.locator('h1:visible').first()).toBeVisible();

    const comparePath =
      (await pickReachablePath(
        page,
        [toolPath as string, '/compare', bestPath as string],
        'a[href^="/compare/"]',
        '/compare/'
      )) ?? (await pickReachablePath(page, ['/compare'], 'a[href^="/compare/"]', '/compare/'));

    expect(comparePath, 'Expected at least one compare path to be reachable').toBeTruthy();
    await expect(page).toHaveURL(/\/compare\//);
    const comparePathname = new URL(page.url()).pathname;
    expect(comparePathname).toMatch(/^\/compare\/.+-vs-.+/);
    const compareHeading = page.locator('h1:visible').first();
    await expect(compareHeading).toBeVisible();
    const compareHeadingText = (await compareHeading.textContent())?.toLowerCase() || '';
    expect(compareHeadingText).toContain('vs');

    await page.goto(toolPath as string, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/tool\//);
    await page.goto(bestPath as string, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/best\//);
    await page.goto(categoryPath as string, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/categories\//);

    console.log(
      JSON.stringify({
        flow: 'home->category->best->tool->compare',
        categoryPath,
        bestPath,
        toolPath,
        comparePath,
      })
    );
  });
});
