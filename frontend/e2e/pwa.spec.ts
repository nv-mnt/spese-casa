/**
 * PWA: gira sulla **build di produzione** servita da `vite preview` (:4199),
 * perche' in sviluppo il service worker non viene registrato.
 */

import {
  accedi,
  apriNavigazione,
  expect,
  navigazione,
  riseminaDatabase,
  test,
} from './helpers';

test.use({ baseURL: 'http://127.0.0.1:4199' });

test.beforeAll(() => riseminaDatabase());

test('il manifest e\' completo e installabile', async ({ page }) => {
  await page.goto('/login');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const risposta = await page.request.get(new URL(href!, 'http://127.0.0.1:4199').toString());
  expect(risposta.ok()).toBeTruthy();
  const manifest = await risposta.json();

  expect(manifest.name).toContain('Spese');
  expect(manifest.start_url).toBeTruthy();
  expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
  expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeTruthy();
  // Serve almeno un'icona 512 per le schermate di avvio.
  expect(manifest.icons.some((i: { sizes?: string }) => i.sizes?.includes('512'))).toBeTruthy();
});

test('il service worker si registra', async ({ page }) => {
  // La registrazione avviene dentro l'app (non sulla pagina di accesso).
  await accedi(page);
  const attivo = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg.active);
  });
  expect(attivo).toBeTruthy();
});

test('offline si rilegge quel che si era gia\' visto', async ({ page, context, browserName }) => {
  await accedi(page);
  // Al primo caricamento il service worker si installa ma non governa ancora
  // la pagina: serve un giro in piu' perche' le risposte finiscano in cache.
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);

  // Si visitano le due pagine che poi si andranno a rileggere.
  await expect(page.getByRole('main')).toContainText('1200,00');
  await apriNavigazione(page);
  await navigazione(page).getByRole('link', { name: /Mesi/ }).click();
  await expect(page.getByRole('main')).toContainText('1700,00');

  await context.setOffline(true);

  // Navigazione dentro l'app (niente ricaricamento): i dati arrivano dalla
  // cache del service worker.
  await apriNavigazione(page);
  await page.getByTitle(/Vai alla dashboard/).locator('visible=true').first().click();
  await expect(page.getByRole('main')).toContainText('1200,00');

  // Riaprire proprio la pagina, da freddo. Su WebKit il driver di Playwright
  // non riesce a navigare mentre e' offline, quindi li' basta la prova sopra.
  if (browserName !== 'webkit') {
    await page.goto('/mesi');
    await expect(page.getByRole('main')).toContainText('1200,00');
    await page.reload();
    await expect(page.getByRole('main')).toContainText('1200,00');
  }
  await context.setOffline(false);
});

test('offline le modifiche sono bloccate con un messaggio chiaro', async ({ page, context }) => {
  await accedi(page);
  await page.goto('/mesi/spese');
  await expect(page.getByRole('main')).toContainText('Affitto settembre');

  await context.setOffline(true);
  await expect(page.getByText(/Sei offline/)).toBeVisible();

  await page.getByRole('button', { name: 'Aggiungi spesa' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Descrizione').fill('Tentativo offline');
  await dialogo.getByRole('textbox', { name: 'Importo' }).fill('5,00');
  await dialogo.getByRole('button', { name: 'Aggiungi spesa' }).click();

  await expect(page.getByRole('status').or(page.getByRole('alert'))).toContainText(
    /offline/i,
  );
  await context.setOffline(false);
});
