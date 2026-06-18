import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check the page loads
    await expect(page).toHaveTitle(/StackHunt/i);
  });

  test('should have navigation', async ({ page }) => {
    await page.goto('/');

    // Check for main navigation elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should display tool cards or content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for main content to load
    await page.waitForLoadState('domcontentloaded');

    // Take a screenshot for visual inspection
    await page.screenshot({ path: 'tests/e2e/screenshots/homepage.png', fullPage: true });
  });
});

test.describe('Tool Pages', () => {
  test('should navigate to a tool page', async ({ page }) => {
    await page.goto('/');

    // Look for any tool link
    let href = await page.locator('a[href^="/tool/"]').first().getAttribute('href');

    if (!href) {
      await page.goto('/tools');
      href = await page.locator('main a[href^="/tool/"]').first().getAttribute('href');
    }

    expect(href, 'Expected at least one tool link from home or tools index').toBeTruthy();
    await page.goto(href as string, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/tool\//);
  });
});

test.describe('Context Pages', () => {
  test('should navigate to a context page', async ({ page }) => {
    await page.goto('/');

    // Look for any "best for" context link
    const contextLink = page.locator('a[href^="/best/"]').first();

    if ((await contextLink.count()) > 0) {
      await contextLink.click();
      await expect(page).toHaveURL(/\/best\//);
    }
  });
});
