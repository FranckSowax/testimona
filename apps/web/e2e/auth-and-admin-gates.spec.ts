import { test, expect } from '@playwright/test';

/**
 * Auth gate + admin gate.
 *
 * No Supabase mutations needed — we only verify the middleware redirects
 * unauthenticated visitors away from /dashboard and non-admins away from
 * /admin.
 */

test.describe('Protected routes — anonymous', () => {
  for (const path of [
    '/dashboard',
    '/dashboard/testimonials',
    '/dashboard/notifications',
    '/dashboard/profile',
    '/dashboard/new',
    '/dashboard/admin-requests',
  ]) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(\?|$)/);
      // next param is preserved so the user lands back on the target after login
      const url = new URL(page.url());
      expect(url.searchParams.get('next')).toBe(path);
    });
  }

  for (const path of [
    '/admin',
    '/admin/users',
    '/admin/memorials',
    '/admin/testimonials',
    '/admin/reports',
    '/admin/donations',
    '/admin/settings',
  ]) {
    test(`${path} redirects to /login for anonymous`, async ({ page }) => {
      await page.goto(path);
      // Middleware redirects to /login since user is null
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });
  }
});

test.describe('Signup flow (no mutation)', () => {
  test('signup form rejects mismatched password length', async ({ page }) => {
    await page.goto('/signup');
    const form = page.locator('form');
    await form.getByLabel(/Pseudonyme|Nickname/i).fill('e2e_runner');
    await form.getByLabel(/Email/i).fill('e2e@example.com');
    // Less than 8 chars triggers minLength validation
    await form.getByLabel(/Mot de passe|Password/i).fill('short');
    await page.getByRole('button', { name: /Créer mon compte|Create.+account/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('login form forwards welcome flag from signup', async ({ page }) => {
    await page.goto('/login?signup=ok&welcome=1');
    // Form is still visible (no auto-redirect)
    await expect(page.getByRole('button', { name: /Se connecter|Log in/ })).toBeVisible();
    // Welcome flag stays in the URL so we can forward it after login success
    const url = new URL(page.url());
    expect(url.searchParams.get('welcome')).toBe('1');
  });
});

test.describe('Error boundaries', () => {
  test('404 on unknown memorial slug', async ({ page }) => {
    const res = await page.goto('/memorial/this-slug-does-not-exist-xxx');
    // Either Next.js notFound() returns 404, or page renders without identity
    if (res?.status() === 404) {
      expect(res.status()).toBe(404);
    } else {
      // generateMetadata returns "Mémorial introuvable" for missing rows
      await expect(page).toHaveTitle(/introuvable|not found/i);
    }
  });
});
