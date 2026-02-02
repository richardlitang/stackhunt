import { test, expect } from '@playwright/test';

test.describe('UI Audit Screenshots', () => {
  test('capture homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-homepage.png', fullPage: true });
  });

  test('capture a tool page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const toolLink = page.locator('a[href^="/tool/"]').first();
    if (await toolLink.count() > 0) {
      await toolLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/audit-tool-page.png', fullPage: true });
    }
  });

  test('capture a context/best page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const contextLink = page.locator('a[href^="/best/"]').first();
    if (await contextLink.count() > 0) {
      await contextLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/audit-context-page.png', fullPage: true });
    }
  });

  test('capture compare page', async ({ page }) => {
    // Go directly to a compare page that should exist
    await page.goto('/compare/klaviyo-vs-omnisend', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-compare-page.png', fullPage: true });
  });

  test('capture categories page', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-categories.png', fullPage: true });
  });

  test('capture lists page', async ({ page }) => {
    await page.goto('/lists', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-lists.png', fullPage: true });
  });

  test('capture tools index page', async ({ page }) => {
    await page.goto('/tools', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-tools-index.png', fullPage: true });
  });

  test('mobile homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/e2e/screenshots/audit-mobile-homepage.png', fullPage: true });
  });

  test('mobile tool page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'networkidle' });
    const toolLink = page.locator('a[href^="/tool/"]').first();
    if (await toolLink.count() > 0) {
      await toolLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/audit-mobile-tool.png', fullPage: true });
    }
  });
});
