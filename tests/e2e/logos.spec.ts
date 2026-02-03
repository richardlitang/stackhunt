import { test, expect } from '@playwright/test';

/**
 * Logo Loading Tests
 * Verifies Brandfetch logos load correctly with fallbacks across all page types
 */

test.describe('Logo Loading', () => {
  // Increase timeout for pages with many images
  test.setTimeout(60000);

  // Helper to check if logos loaded (not broken/hidden)
  async function checkLogosLoaded(page: any) {
    // Wait for images to start loading
    await page.waitForTimeout(3000);

    // Find all logo images
    const logos = page.locator('img[alt*="logo"]');
    const count = await logos.count();

    if (count === 0) {
      return { total: 0, loaded: 0, failed: 0 };
    }

    let loaded = 0;
    let failed = 0;

    for (let i = 0; i < count; i++) {
      const logo = logos.nth(i);
      const isVisible = await logo.isVisible();

      if (isVisible) {
        // Check if image has natural dimensions (loaded successfully)
        const naturalWidth = await logo.evaluate((img: HTMLImageElement) => img.naturalWidth);
        if (naturalWidth > 0) {
          loaded++;
        } else {
          failed++;
        }
      }
    }

    return { total: count, loaded, failed };
  }

  test('Homepage - logos should load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await checkLogosLoaded(page);
    console.log(`Homepage: ${result.loaded}/${result.total} logos loaded`);

    // At least some logos should load
    if (result.total > 0) {
      expect(result.loaded).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/logos-homepage.png', fullPage: true });
  });

  test('Tool Page - logo should load', async ({ page }) => {
    await page.goto('/tool/slack');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page content
    await page.waitForTimeout(2000);

    // Check main tool logo
    const mainLogo = page.locator('img[alt*="logo"]').first();

    if (await mainLogo.count() > 0) {
      await expect(mainLogo).toBeVisible({ timeout: 10000 });
      const naturalWidth = await mainLogo.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/logos-tool-page.png', fullPage: true });
  });

  test('Best (Context) Page - logos should load', async ({ page }) => {
    await page.goto('/best/project-management-software');
    await page.waitForLoadState('domcontentloaded');

    const result = await checkLogosLoaded(page);
    console.log(`Context page: ${result.loaded}/${result.total} logos loaded`);

    if (result.total > 0) {
      expect(result.loaded).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/logos-context-page.png', fullPage: true });
  });

  test('Dentists Page - logos should load (regression test)', async ({ page }) => {
    // This was a known problem page
    await page.goto('/best/software-tools-for-dentists');
    await page.waitForLoadState('domcontentloaded');

    const result = await checkLogosLoaded(page);
    console.log(`Dentists page: ${result.loaded}/${result.total} logos loaded`);

    // Should have at least some tools with working logos
    if (result.total > 0) {
      expect(result.loaded).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/logos-dentists-page.png', fullPage: true });
  });

  test('Compare Page - logos should load', async ({ page }) => {
    await page.goto('/compare/slack-vs-microsoft-teams');
    await page.waitForLoadState('domcontentloaded');

    const result = await checkLogosLoaded(page);
    console.log(`Compare page: ${result.loaded}/${result.total} logos loaded`);

    // Both compared tools should have logos
    if (result.total > 0) {
      expect(result.loaded).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/logos-compare-page.png', fullPage: true });
  });

  test('Compare Index Page - logos in popular comparisons', async ({ page }) => {
    await page.goto('/compare');
    await page.waitForLoadState('domcontentloaded');

    // This page has text links, not logos - just verify it loads
    await expect(page).toHaveTitle(/Compare/i);

    await page.screenshot({ path: 'tests/e2e/screenshots/logos-compare-index.png', fullPage: true });
  });

  test('Logo fallback chain works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check that no logos show broken image icons
    const brokenImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img[alt*="logo"]');
      let broken = 0;
      images.forEach((img: any) => {
        // Check if image failed to load and didn't fall back
        if (img.complete && img.naturalWidth === 0 && getComputedStyle(img).display !== 'none') {
          broken++;
        }
      });
      return broken;
    });

    expect(brokenImages).toBe(0);
  });
});
