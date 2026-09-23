/** Autenticazione: chi entra, chi resta fuori, e cosa succede al token. */

import { accedi, esci, expect, riseminaDatabase, test, UTENTE_A } from './helpers';

test.beforeAll(() => riseminaDatabase());

test('senza sessione le rotte protette rimandano al login', async ({ page }) => {
  await page.goto('/mesi');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible();
});

test('login con credenziali giuste apre il mese corrente', async ({ page, erroriConsole }) => {
  await accedi(page);
  await expect(page).toHaveURL(/\/mesi$/);
  await expect(page.getByRole('main')).toContainText('Settembre 2026');
  expect(erroriConsole, 'console pulita durante il login').toEqual([]);
});

test('login con password sbagliata mostra un errore e non entra', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(UTENTE_A.email);
  await page.getByLabel('Password').fill('password-sbagliata');
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('alert')).toContainText(/non corrett|credenziali/i);
  await expect(page).toHaveURL(/\/login$/);
});

test('la sessione sopravvive al ricaricamento', async ({ page }) => {
  await accedi(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Menu utente' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Settembre 2026');
});

test('con il token di accesso scaduto la sessione si rinnova da sola', async ({ page }) => {
  await accedi(page);
  // Access token rovinato, refresh token intatto: l'interceptor deve
  // rinnovare e ripetere la chiamata senza buttare fuori l'utente.
  await page.evaluate(() =>
    window.localStorage.setItem('spese-casa.access_token', 'token.non.valido'),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Menu utente' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Settembre 2026');
  const nuovo = await page.evaluate(() =>
    window.localStorage.getItem('spese-casa.access_token'),
  );
  expect(nuovo).not.toBe('token.non.valido');
});

test('logout: si torna al login e le rotte tornano protette', async ({ page }) => {
  await accedi(page);
  await esci(page);
  await page.goto('/budget');
  await expect(page).toHaveURL(/\/login$/);
});

test('registrazione: il nuovo utente entra nella sua casa vuota', async ({ page }) => {
  const email = `nuovo-${Date.now()}@e2etest.it`;
  await page.goto('/registrazione');
  await page.getByLabel('Nome', { exact: true }).fill('Nuovo');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Conferma password').fill('password123');
  await page.getByRole('button', { name: /registrati|crea/i }).click();
  await expect(page.getByRole('button', { name: 'Menu utente' })).toBeVisible();
  // Casa nuova: nessuna spesa di Giuseppe e Angela.
  await expect(page.getByRole('main')).not.toContainText('Affitto settembre');
});
