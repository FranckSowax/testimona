import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Desktop Chrome'] });

test.describe('Desktop ≥ 1280px', () => {
  test('hamburger is hidden on the home page (lg:hidden)', async ({ page }) => {
    await page.goto('/');
    // Sidebar / hamburger toggle uses Tailwind lg:hidden, so on Desktop Chrome
    // (1280x720 default) it should not be in the layout.
    const hamburger = page.getByRole('button', { name: /Accueil|Home/i }).first();
    await expect(hamburger).toBeHidden();
  });

  test('header search input is visible on desktop (sm:flex)', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder(/Rechercher|Search/i).first();
    await expect(search).toBeVisible();
  });

  test('footer renders the share-to-a-friend block', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByText(/Partager à un ami|Share to a friend/i)).toBeVisible();
  });
});
