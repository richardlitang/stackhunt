import { expect, test, type Page } from '@playwright/test';

const SNAPSHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.02,
};

async function prepareForVisualSnapshot(page: Page) {
  await page.route('https://analytics.stackhunt.io/**', (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }

      #suggest-edit-modal,
      [id^="radix-"],
      [role="status"][aria-live] {
        visibility: hidden !important;
      }
    `,
  });

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(200);
}

test.describe('Visual regression smoke', () => {
  test('home shell desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await prepareForVisualSnapshot(page);

    const quickLinks = page.getByText('Popular:').first().locator('..');
    const categoryStrip = page.locator('main > section').nth(1);

    await expect(page).toHaveScreenshot('visual-home-shell-desktop.png', {
      ...SNAPSHOT_OPTIONS,
      mask: [quickLinks, categoryStrip],
    });
  });

  test('about page desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await prepareForVisualSnapshot(page);

    await expect(page).toHaveScreenshot('visual-about-desktop.png', {
      ...SNAPSHOT_OPTIONS,
      fullPage: true,
    });
  });

  test('contact page desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await prepareForVisualSnapshot(page);

    await expect(page).toHaveScreenshot('visual-contact-desktop.png', {
      ...SNAPSHOT_OPTIONS,
      fullPage: true,
    });
  });

  test('methodology header desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/methodology', { waitUntil: 'domcontentloaded' });
    await prepareForVisualSnapshot(page);

    const header = page.locator('main > div').first();
    await expect(header).toHaveScreenshot('visual-methodology-header-desktop.png', {
      ...SNAPSHOT_OPTIONS,
    });
  });

  test('home shell mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await prepareForVisualSnapshot(page);

    const quickLinks = page.getByText('Popular:').first().locator('..');
    await expect(page).toHaveScreenshot('visual-home-shell-mobile.png', {
      ...SNAPSHOT_OPTIONS,
      maxDiffPixelRatio: 0.03,
      mask: [quickLinks],
    });
  });
});
