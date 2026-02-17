import { test, type Page } from '@playwright/test';

async function gotoAuditPage(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
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
    if (await toolLink.count() > 0) {
      await toolLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/audit-tool-page.png', fullPage: true });
    }
  });

  test('capture a context/best page', async ({ page }) => {
    await gotoAuditPage(page, '/');
    const contextLink = page.locator('a[href^="/best/"]').first();
    if (await contextLink.count() > 0) {
      await contextLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/audit-context-page.png', fullPage: true });
    }
  });

  test('capture compare page', async ({ page }) => {
    const discoveryPages = ['/', '/tools', '/best'];
    let compareHref: string | null = null;

    for (const path of discoveryPages) {
      await gotoAuditPage(page, path);
      const compareLink = page.locator('a[href^="/compare/"]').first();
      if ((await compareLink.count()) > 0) {
        compareHref = await compareLink.getAttribute('href');
        if (compareHref) break;
      }
    }

    await gotoAuditPage(page, compareHref || '/compare');
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
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-mobile-homepage.png', fullPage: true });
  });

  test('mobile tool page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAuditPage(page, '/');
    const toolLink = page.locator('a[href^="/tool/"]').first();
    if (await toolLink.count() > 0) {
      await toolLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/audit-mobile-tool.png', fullPage: true });
    }
  });
});
