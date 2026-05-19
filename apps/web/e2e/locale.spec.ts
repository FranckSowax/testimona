import { test, expect } from '@playwright/test';

/**
 * Bilingual switching — every page should switch FR ↔ EN cleanly through
 * the LocaleSwitcher in the header.
 */

test.describe('Locale switching', () => {
  test('home: FR default renders French copy', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Célébrons ces|beaux souvenirs/i).first()).toBeVisible();
    await expect(page.getByText(/Comment ça marche/i).first()).toBeVisible();
  });

  test('home: /en renders English copy', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByText(/How it works/i).first()).toBeVisible();
    await expect(
      page.getByText(/Honor the memory of someone you love/i).first(),
    ).toBeVisible();
  });

  test('LocaleSwitcher select is present and lists fr/en', async ({ page }) => {
    await page.goto('/');
    const select = page.locator('select').first();
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    expect(options.join(' ').toLowerCase()).toContain('français');
    expect(options.join(' ').toLowerCase()).toContain('english');
  });

  test('FAQ section uses native <details> (works without JS)', async ({ page }) => {
    await page.goto('/');
    const firstDetails = page.locator('details').first();
    await expect(firstDetails).toBeVisible();
    // Toggle by clicking the summary
    await firstDetails.locator('summary').click();
    // After click, details should be marked open
    await expect(firstDetails).toHaveAttribute('open', '');
  });
});
