import { test, type Page } from '@playwright/test';

async function dismissDemoDialog(page: Page) {
  const dismissButton = page.getByRole('button', { name: 'Got it' });
  await dismissButton.waitFor({ state: 'visible', timeout: 1_000 }).catch(() => undefined);
  if (await dismissButton.isVisible()) {
    await dismissButton.click();
  }
}

async function gotoAuditPage(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await dismissDemoDialog(page);
}

async function discoverReachablePath(
  page: Page,
  discoveryPages: string[],
  selector: string,
  expectedPrefix: string,
  validatePage?: (page: Page) => Promise<boolean>
) {
  const tried = new Set<string>();

  for (const discoveryPath of discoveryPages) {
    await gotoAuditPage(page, discoveryPath);
    const hrefs = await page
      .locator(selector)
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node as HTMLAnchorElement).getAttribute('href') || '')
          .filter((href) => href.startsWith('/'))
      );

    for (const href of hrefs) {
      if (tried.has(href)) continue;
      tried.add(href);

      const response = await page.goto(href, { waitUntil: 'domcontentloaded' });
      const pathname = new URL(page.url()).pathname;
      const pageIsValid = validatePage ? await validatePage(page) : true;
      if ((response?.status() ?? 500) < 400 && pathname.startsWith(expectedPrefix) && pageIsValid) {
        return href;
      }
    }
  }

  return null;
}

async function findFirstSuccessfulPath(page: Page, candidates: string[], expectedPrefix: string) {
  for (const candidate of candidates) {
    const response = await page.goto(candidate, { waitUntil: 'domcontentloaded' });
    const pathname = new URL(page.url()).pathname;
    if ((response?.status() ?? 500) < 400 && pathname.startsWith(expectedPrefix)) {
      return candidate;
    }
  }
  return null;
}

test.describe('UI Audit Screenshots', () => {
  test.describe.configure({ timeout: 120_000 });

  test('capture homepage', async ({ page }) => {
    await gotoAuditPage(page, '/');
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-homepage.png', fullPage: true });
  });

  test('capture a tool page', async ({ page }) => {
    await gotoAuditPage(page, '/');
    const toolLink = page.locator('a[href^="/tool/"]').first();
    const toolPath = await toolLink.getAttribute('href');
    if (toolPath) {
      await gotoAuditPage(page, toolPath);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/audit-tool-page.png', fullPage: true });
    }
  });

  test('capture a context/best page', async ({ page }) => {
    const bestPath = await discoverReachablePath(
      page,
      ['/best', '/'],
      'a[href^="/best/"]',
      '/best/',
      async (candidatePage) => (await candidatePage.getByText('No tools yet').count()) === 0
    );
    if (bestPath) {
      await gotoAuditPage(page, bestPath);
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'tests/e2e/screenshots/audit-context-page.png',
        fullPage: true,
      });
      return;
    }

    await gotoAuditPage(page, '/best');
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-context-page.png', fullPage: true });
  });

  test('capture compare page', async ({ page }) => {
    const directComparePath = await findFirstSuccessfulPath(
      page,
      ['/compare/canva-vs-figma', '/compare/figma-vs-canva'],
      '/compare/'
    );
    if (directComparePath) {
      await gotoAuditPage(page, directComparePath);
      await page.screenshot({
        path: 'tests/e2e/screenshots/audit-compare-page.png',
        fullPage: true,
      });
      return;
    }

    const comparePath = await discoverReachablePath(
      page,
      ['/compare', '/best', '/tools', '/'],
      'a[href^="/compare/"][href*="-vs-"]',
      '/compare/'
    );
    await gotoAuditPage(page, comparePath || '/compare');
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-compare-page.png', fullPage: true });
  });

  test('capture categories page', async ({ page }) => {
    await gotoAuditPage(page, '/categories');
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-categories.png', fullPage: true });
  });

  test('capture lists page', async ({ page }) => {
    await gotoAuditPage(page, '/lists');
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-lists.png', fullPage: true });
  });

  test('capture tools index page', async ({ page }) => {
    await gotoAuditPage(page, '/tools');
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-tools-index.png', fullPage: true });
  });

  test('mobile homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAuditPage(page, '/');
    await page.screenshot({
      path: 'tests/e2e/screenshots/audit-mobile-homepage.png',
      fullPage: true,
    });
  });

  test('mobile tool page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAuditPage(page, '/');
    const toolLink = page.locator('a[href^="/tool/"]').first();
    const toolPath = await toolLink.getAttribute('href');
    if (toolPath) {
      await gotoAuditPage(page, toolPath);
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'tests/e2e/screenshots/audit-mobile-tool.png',
        fullPage: true,
      });
    }
  });
});
