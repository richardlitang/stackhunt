import { expect, test, type Page } from '@playwright/test';

const TOOL_PATH = '/tool/perplexity';
const SNAPSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.02,
};
const INTERNAL_LINK_TIMEOUT_MS = 8000;
const MAX_INTERNAL_LINK_CHECKS = 6;

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

function isPublicInternalLink(href: string): boolean {
  if (!href.startsWith('/')) return false;
  if (href.startsWith('//')) return false;
  if (href.startsWith('/admin')) return false;
  if (href.startsWith('/api')) return false;
  return true;
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

  test('tool page anchors and internal links stay healthy', async ({ page }) => {
    await openToolPage(page);

    const inPageAnchors = await page
      .locator('main a[href^="#"]')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node as HTMLAnchorElement).getAttribute('href') || '')
          .filter((href) => href.length > 1)
      );
    const uniqueAnchorTargets = Array.from(new Set(inPageAnchors.map((href) => href.slice(1))));
    for (const targetId of uniqueAnchorTargets) {
      const targetExists = (await page.locator(`[id="${targetId}"]`).count()) > 0;
      expect(targetExists, `In-page anchor target should exist: #${targetId}`).toBeTruthy();
    }

    const internalLinks = await page
      .locator('main a[href]')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => (node as HTMLAnchorElement).getAttribute('href') || '')
          .filter((href) => href.length > 0)
      );
    const linksToCheck = Array.from(
      new Set(
        internalLinks
          .map((href) => href.split('#')[0])
          .filter((href) => href.length > 0 && isPublicInternalLink(href))
      )
    ).slice(0, MAX_INTERNAL_LINK_CHECKS);

    for (const href of linksToCheck) {
      const response = await page.request.get(href, {
        maxRedirects: 5,
        timeout: INTERNAL_LINK_TIMEOUT_MS,
      });
      expect(response.status(), `Broken internal link found on tool page: ${href}`).toBeLessThan(
        400
      );
    }
  });

  test('source links expose descriptive accessible labels', async ({ page }) => {
    await openToolPage(page);

    const weakOutboundLabels = await page
      .locator('main a[data-outbound="source"]')
      .evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const element = node as HTMLAnchorElement;
            const label = element.getAttribute('aria-label')?.trim().toLowerCase() ?? '';
            const text = element.textContent?.trim().toLowerCase() ?? '';
            const accessibleName = label || text;
            return { label, text, accessibleName };
          })
          .filter(
            ({ accessibleName }) =>
              !accessibleName ||
              /^(source|claim source|answer source|click here|read more|learn more|view source)$/i.test(
                accessibleName
              )
          )
      );

    expect(
      weakOutboundLabels,
      'Source links should expose descriptive accessible labels'
    ).toHaveLength(0);
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
