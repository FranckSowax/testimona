import { test, expect } from '@playwright/test';

/**
 * Mobile responsiveness — hamburger drawer, sticky header, no horizontal scroll.
 *
 * Uses an explicit mobile viewport rather than devices['iPhone SE'] so the
 * suite runs on the Chromium binary that's already installed and doesn't
 * require a separate Playwright webkit download.
 */

test.use({
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  isMobile: true,
});

test.describe('Mobile (375x812 iPhone SE)', () => {
  test('hamburger button is visible on home (lg:hidden)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Accueil|Home/i }).first()).toBeVisible();
  });

  test('hamburger opens drawer with primary nav', async ({ page }) => {
    await page.goto('/');
    const hamburger = page.getByRole('button', { name: /Accueil|Home/i }).first();
    await hamburger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('link', { name: /Se connecter|Sign in/i }).first()).toBeVisible();
  });

  test('drawer closes on Escape', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: /Accueil|Home/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('no horizontal scroll on home', async ({ page }) => {
    await page.goto('/');
    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth + 1);
  });

  test('search input is hidden on mobile (sm:flex)', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder(/Rechercher|Search/i).first();
    await expect(search).toBeHidden();
  });
});
