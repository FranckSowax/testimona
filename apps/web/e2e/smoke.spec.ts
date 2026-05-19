import { test, expect } from '@playwright/test';

/**
 * Smoke tests — V2 critical pages render without auth.
 * Run with : pnpm test:e2e
 *
 * Pre-req: Supabase env vars set, dev server runs (auto-started by Playwright config).
 * For CI: deploy preview + PLAYWRIGHT_BASE_URL=https://your-preview.url
 */

test.describe('Public pages', () => {
  test('Home (anonymous) — V2 hero "beautiful stories"', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Célébrons ces|Let's share/)).toBeVisible();
    await expect(page.getByText(/beaux souvenirs|beautiful stories/)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Écrire un témoignage|Write a testimonial/ }),
    ).toBeVisible();
    await expect(page.getByText(/Derniers|Recent/).first()).toBeVisible();
  });

  test('Login page — V2 form on mesh background', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Connexion|Login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/exemple\.com/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Se connecter|Log in/ })).toBeVisible();
  });

  test('Signup page — V2 form on mesh', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /Créer un compte|Create.+account/i })).toBeVisible();
    await expect(page.getByLabel(/Pseudonyme|Nickname|Username/i)).toBeVisible();
    await expect(page.getByLabel(/Mot de passe|Password/i)).toBeVisible();
  });

  test('Search page — empty state V2', async ({ page }) => {
    await page.goto('/search');
    await expect(
      page.getByPlaceholder(/Nom, prénom ou surnom|Search/i),
    ).toBeVisible();
  });

  test('About page', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Legal pages render', async ({ page }) => {
    for (const slug of ['mentions', 'privacy', 'terms']) {
      await page.goto(`/legal/${slug}`);
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });
});

test.describe('Layout shell V2', () => {
  test('Header has logo + nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Accueil|Home/i }).first()).toBeVisible();
  });

  test('Footer V2 has Testimona copyright + Privacy/Terms links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByText(/Testimona, Inc\./)).toBeVisible();
    await expect(footer.getByRole('link', { name: /Confidentialité|Privacy/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /CGU|Terms/i })).toBeVisible();
  });
});

test.describe('Auth flow (UI only — no Supabase mutation)', () => {
  test('Signup form does not navigate on invalid email', async ({ page }) => {
    await page.goto('/signup');
    // Scope to the form so the locator doesn't also match the footer's
    // "Email" share link (which carries aria-label="Email").
    const form = page.locator('form');
    await form.getByLabel(/Pseudonyme|Nickname|Username/i).fill('test_user');
    await form.getByLabel(/Email/i).fill('not-an-email');
    await form.getByLabel(/Mot de passe|Password/i).fill('pass1234');
    await page.getByRole('button', { name: /Créer mon compte|Create.+account/i }).click();
    // HTML5 native email validation prevents submit; URL stays on /signup
    await expect(page).toHaveURL(/\/signup/);
  });

  test('Login → forgot password link visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /oublié|forgot/i })).toBeVisible();
  });
});
