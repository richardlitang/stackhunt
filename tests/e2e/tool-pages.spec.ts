import { expect, test, type Page } from '@playwright/test';

const TOOL_PATH = '/tool/perplexity';
const SNAPSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.02,
};

async function openToolPage(page: Page) {
  await page.route('https://analytics.stackhunt.io/**', (route) => route.abort());
  const response = await page.goto(TOOL_PATH, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), 'Representative tool page should return success').toBeLessThan(400);
}

async function stabilizeForScreenshot(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
    `,
  });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(200);
}

test.describe('Tool page quality and visuals', () => {
  test('tool page has quality fundamentals', async ({ page }) => {
    await openToolPage(page);

    await expect(page.locator('h1:visible')).toHaveCount(1);
    await expect(page.locator('#pricing-plans')).toBeVisible();
    await expect(page.locator('#verdict, section:has-text("Decision:")').first()).toBeVisible();

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    expect(canonical, 'Tool page should include canonical URL').toBeTruthy();
    if (canonical && /^https?:\/\//i.test(canonical)) {
      const canonicalPath = new URL(canonical).pathname;
      expect(canonicalPath.startsWith('/tool/') || canonicalPath === '/tools').toBeTruthy();
    }

    const outboundLinks = await page.locator('main a[target="_blank"]').count();
    expect(outboundLinks, 'Tool page should expose outbound references/CTAs').toBeGreaterThan(0);
  });

  test('tool hero visual desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openToolPage(page);
    await stabilizeForScreenshot(page);

    const hero = page.locator('main header').first();
    await expect(hero).toHaveScreenshot('visual-tool-hero-desktop.png', {
      ...SNAPSHOT_OPTIONS,
      mask: [
        hero.locator('h1'),
        hero.locator('p'),
        hero.locator('img').first(),
        hero.locator('.text-zinc-500'),
      ],
    });
  });

  test('tool hero visual mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openToolPage(page);
    await stabilizeForScreenshot(page);

    const hero = page.locator('main header').first();
    await expect(hero).toHaveScreenshot('visual-tool-hero-mobile.png', {
      ...SNAPSHOT_OPTIONS,
      maxDiffPixelRatio: 0.03,
      mask: [
        hero.locator('h1'),
        hero.locator('p'),
        hero.locator('img').first(),
        hero.locator('.text-zinc-500'),
      ],
    });
  });
});
