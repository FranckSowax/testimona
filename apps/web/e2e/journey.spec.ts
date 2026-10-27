import { test, expect } from '@playwright/test';

/**
 * Parcours : répondre à une question de la biographie.
 * Crée un vrai dossier : ne tourne qu'avec un compte de test (E2E_EMAIL, E2E_PASSWORD)
 * sur une base de test, jamais sur la production.
 */
const EMAIL = process.env.E2E_EMAIL ?? '';
const PASSWORD = process.env.E2E_PASSWORD ?? '';

test.describe('Parcours (compte de test)', () => {
  test.skip(!EMAIL || !PASSWORD, 'Définir E2E_EMAIL et E2E_PASSWORD (compte et base de test).');

  test('créer un dossier, répondre à une question, voir l’avancement', async ({ page }) => {
    await page.goto('/login?next=%2Fdossier%2Fnouveau%3Fporte%3Ddeces');
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL(/\/dossier\/nouveau/);

    await page.locator('#wizard-firstName').fill('Test');
    await page.locator('#wizard-lastName').fill(`E2E ${Date.now()}`);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#wizard-city').fill('Libreville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByText('Enfant', { exact: true }).click();
    await page.getByRole('button', { name: 'Ouvrir le dossier' }).click();
    await expect(page).toHaveURL(/\/dossier\/[0-9a-f-]{36}$/);
    const dossierUrl = page.url();

    await page.getByRole('link', { name: 'Répondre' }).click();
    await expect(page).toHaveURL(/\/etape\/biography\?q=0$/);
    await page.locator('#answer-biography-birthPlace').fill('Lambaréné');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page).toHaveURL(/\/etape\/biography\?q=1$/);

    await page.getByRole('button', { name: 'Passer' }).click();
    await expect(page).toHaveURL(/\/etape\/biography\?q=2$/);

    await page.goto(dossierUrl);
    await expect(page.getByText('1 sur 6 réponses')).toBeVisible();
    await expect(page.getByText('1 question à compléter')).toBeVisible();
  });
});
