import { test, expect } from '@playwright/test';

/**
 * Memorial detail golden-path tests.
 *
 * Targets one of the seed slugs (sofia-bernardi). If you wipe/seed the DB,
 * change MEMORIAL_SLUG below — or set PLAYWRIGHT_MEMORIAL_SLUG in env.
 */

const MEMORIAL_SLUG =
  process.env.PLAYWRIGHT_MEMORIAL_SLUG ?? 'sofia-bernardi';

test.describe('Memorial public detail', () => {
  test('renders all 5 tabs + identity card', async ({ page }) => {
    await page.goto(`/memorial/${MEMORIAL_SLUG}`);

    // Identity: name heading is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 5 tabs present (FR labels — page defaults to fr)
    for (const label of [
      /Témoignages/i,
      /Photos/i,
      /Faire un don/i,
      /Biographie/i,
      /Funérailles/i,
    ]) {
      await expect(page.getByRole('tab', { name: label }).first()).toBeVisible();
    }
  });

  test('switching tab updates active panel', async ({ page }) => {
    await page.goto(`/memorial/${MEMORIAL_SLUG}`);
    await page.getByRole('tab', { name: /Faire un don/i }).first().click();
    // Donation tab content area becomes visible
    await expect(
      page.getByText(/objectif de collecte|Make a donation/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Make a donation CTA is wired (does not 500)', async ({ page }) => {
    await page.goto(`/memorial/${MEMORIAL_SLUG}?tab=donate`);
    const cta = page.getByRole('button', { name: /Faire un don|Make a donation/i }).first();
    await expect(cta).toBeVisible();
    await cta.click();
    // Donation popup opens (PopupCard renders <dialog>)
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Memorial SEO', () => {
  test('sets canonical, OG and Twitter meta tags', async ({ page }) => {
    const response = await page.goto(`/memorial/${MEMORIAL_SLUG}`);
    expect(response?.ok()).toBeTruthy();

    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    expect(canonical).toMatch(/\/memorial\//);

    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute('content');
    expect(ogTitle).toBeTruthy();

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImage).toContain('/api/og/memorial/');

    const twitterCard = await page
      .locator('meta[name="twitter:card"]')
      .getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
  });

  test('OG image route returns a PNG', async ({ request }) => {
    const res = await request.get(`/api/og/memorial/${MEMORIAL_SLUG}`);
    expect(res.ok()).toBeTruthy();
    const ctype = res.headers()['content-type'];
    expect(ctype).toContain('image');
  });

  test('robots.txt blocks /admin and /dashboard', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('Disallow: /admin/');
    expect(body).toContain('Disallow: /dashboard/');
  });

  test('sitemap.xml lists at least the homepage', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('<urlset');
    // Homepage url
    expect(body).toMatch(/<loc>[^<]*\/<\/loc>/);
  });
});
