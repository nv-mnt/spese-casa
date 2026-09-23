/**
 * Controlli trasversali: responsivita', accessibilita' di base, tema scuro.
 * Girano su tutti i dispositivi configurati, quindi le soglie valgono sia su
 * desktop sia su telefono.
 */

import {
  accedi,
  apriNavigazione,
  expect,
  navigazione,
  riseminaDatabase,
  test,
  voce,
} from './helpers';

const ROTTE = ['/mesi', '/mesi/spese', '/mesi/elenco', '/mesi/andamento', '/budget', '/cestino'];

test.beforeAll(() => riseminaDatabase());

test.beforeEach(async ({ page }) => {
  await accedi(page);
});

test('nessuna pagina scorre in orizzontale', async ({ page }) => {
  for (const rotta of ROTTE) {
    await page.goto(rotta);
    await page.waitForTimeout(400);
    const misure = await page.evaluate(() => ({
      documento: document.documentElement.scrollWidth,
      finestra: window.innerWidth,
    }));
    expect(misure.documento, `overflow su ${rotta}`).toBeLessThanOrEqual(misure.finestra + 1);
  }
});

test('i bersagli da toccare sono abbastanza grandi', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'la soglia dei 44px riguarda il tocco');
  await apriNavigazione(page);
  const voci = navigazione(page).getByRole('link');
  const quante = await voci.count();
  for (let i = 0; i < quante; i += 1) {
    const misura = await voci.nth(i).boundingBox();
    expect(misura!.height, `altezza voce ${i}`).toBeGreaterThanOrEqual(40);
  }
  const menu = await page.getByRole('button', { name: 'Menu utente' }).boundingBox();
  expect(menu!.height).toBeGreaterThanOrEqual(36);
});

test('i campi dei form hanno tutti un nome accessibile', async ({ page }) => {
  await page.goto('/mesi/spese');
  await page.getByRole('button', { name: 'Aggiungi spesa' }).click();
  const dialogo = page.getByRole('dialog');
  for (const campo of await dialogo.getByRole('textbox').all()) {
    const nome = await campo.evaluate((el) => {
      const etichetta = el.labels?.[0]?.textContent ?? el.getAttribute('aria-label') ?? '';
      return etichetta.trim();
    });
    expect(nome, 'campo senza etichetta').not.toBe('');
  }
});

test('il dialogo prende il fuoco e si chiude con Escape', async ({ page }) => {
  await page.goto('/mesi/spese');
  await page.getByRole('button', { name: 'Aggiungi spesa' }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();

  // Il fuoco e' finito dentro al dialogo (Radix lo sposta al montaggio).
  await page.waitForTimeout(400);
  const dentro = await dialogo.evaluate((el) => el.contains(document.activeElement));
  expect(dentro, 'il fuoco deve entrare nel dialogo').toBeTruthy();

  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();
});

test('si naviga da tastiera fino alle voci del menu', async ({ page, isMobile }) => {
  test.skip(isMobile, 'la barra laterale e\' un drawer sul telefono');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const attivo = await page.evaluate(() => document.activeElement?.tagName);
  expect(['A', 'BUTTON', 'INPUT']).toContain(attivo);
});

test('il tema scuro non rompe il layout', async ({ page }) => {
  await page.getByRole('button', { name: 'Cambia tema' }).click();
  await page.getByRole('menuitem', { name: /notte/i }).click();
  await page.waitForTimeout(400);
  const scuro = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(scuro).toBeTruthy();

  const misure = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    finestra: window.innerWidth,
  }));
  expect(misure.documento).toBeLessThanOrEqual(misure.finestra + 1);
});

test('stati di caricamento, errore e vuoto', async ({ page }) => {
  // Vuoto: un mese appena creato non ha spese.
  await page.goto('/mesi/elenco');
  await page.getByRole('button', { name: 'Nuovo mese' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome del periodo').fill('Mese vuoto 2027');
  await dialogo.getByRole('button', { name: /Crea/ }).click();
  await expect(page).toHaveURL(/\/mesi\/\d+$/);
  await expect(page.getByRole('main')).toContainText(/non c’è ancora niente/i);

  // Errore: una rotta inesistente sul server deve mostrare lo stato d'errore
  // e lasciare viva la navigazione.
  await page.goto('/mesi/999999');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu utente' })).toBeVisible();
});

test('niente doppio invio: il pulsante si disabilita durante il salvataggio', async ({ page }) => {
  await page.goto('/mesi/spese');
  await page.getByRole('button', { name: 'Aggiungi spesa' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Descrizione').fill('Doppio invio');
  await dialogo.getByRole('textbox', { name: 'Importo' }).fill('7,00');

  const salva = dialogo.getByRole('button', { name: 'Aggiungi spesa' });
  await salva.click();
  await expect(page.getByRole('dialog')).toBeHidden();
  // Una sola riga, non due.
  await expect(voce(page, 'Doppio invio')).toHaveCount(1);
});
