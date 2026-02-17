import { expect, test, type Locator, type Page } from '@playwright/test';

test.describe('Pricing Display Features', () => {
  test.setTimeout(60_000);

  async function openToolPricing(page: Page, slug: string) {
    await page.goto(`/tool/${slug}`, { waitUntil: 'domcontentloaded' });
    const pricingSection = page.locator('#pricing-plans');
    await expect(pricingSection, `${slug} should expose a pricing section`).toBeVisible({ timeout: 15_000 });
    return pricingSection;
  }

  async function assertPricingSectionHasContent(pricingSection: Locator) {
    const hasTable = (await pricingSection.locator('table').count()) > 0;
    const hasGridCards = (await pricingSection.locator('.grid > *').count()) > 0;
    const hasFallbackSnapshot =
      (await pricingSection.getByText(/Structured pricing table is unavailable|Varies by plan/i).count()) > 0;

    expect(
      hasTable || hasGridCards || hasFallbackSnapshot,
      'Pricing section should have either structured plans or a verified fallback snapshot'
    ).toBeTruthy();
  }

  test('Twilio pricing section renders structured or fallback data', async ({ page }) => {
    const pricingSection = await openToolPricing(page, 'twilio');
    await assertPricingSectionHasContent(pricingSection);
    await page.screenshot({ path: 'tests/e2e/screenshots/pricing-twilio.png', fullPage: true });
  });

  test('Slack pricing section renders structured or fallback data', async ({ page }) => {
    const pricingSection = await openToolPricing(page, 'slack');
    await assertPricingSectionHasContent(pricingSection);
    await page.screenshot({ path: 'tests/e2e/screenshots/pricing-slack.png', fullPage: true });
  });

  test('Mailchimp pricing section renders structured or fallback data', async ({ page }) => {
    const pricingSection = await openToolPricing(page, 'mailchimp');
    await assertPricingSectionHasContent(pricingSection);
    await page.screenshot({ path: 'tests/e2e/screenshots/pricing-mailchimp.png', fullPage: true });
  });

  test('Compare index exposes comparison links', async ({ page }) => {
    await page.goto('/compare', { waitUntil: 'domcontentloaded' });
    const linkCount = await page.locator('main a[href^="/compare/"]').count();
    expect(linkCount, 'Expected at least one comparison link on /compare').toBeGreaterThan(0);
  });

  test('Blocked comparison routes fail gracefully to recovery actions', async ({ page }) => {
    await page.goto('/compare/slack-vs-twilio', { waitUntil: 'domcontentloaded' });

    const onComparePage = /\/compare\//.test(new URL(page.url()).pathname);
    if (onComparePage) {
      await expect(page.locator('h1').first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/Page not found/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Go Home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Browse Tools/i })).toBeVisible();
  });

  test('Unknown unit labels are shown when structured pricing exists', async ({ page }) => {
    const pricingSection = await openToolPricing(page, 'twilio');
    const hasTable = (await pricingSection.locator('table').count()) > 0;

    if (!hasTable) {
      await expect(pricingSection.getByText(/Structured pricing table is unavailable|Varies by plan/i).first()).toBeVisible();
      return;
    }

    const unitMentions = await pricingSection.getByText(/per\s+[a-z]+/i).count();
    expect(unitMentions, 'Expected at least one unit label in structured pricing rows').toBeGreaterThan(0);
  });
});
