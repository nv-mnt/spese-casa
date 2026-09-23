/**
 * Collegamento Spese casa -> Budget personale: niente doppia digitazione.
 *
 * Agosto nel seed e' il caso della specifica: 300 pagati da Giuseppe e 150
 * di conguaglio versati da Angela -> per Giuseppe saldo reale -150.
 */

import { accedi, expect, MESE_PRECEDENTE, riseminaDatabase, test } from './helpers';

test.beforeEach(async ({ page }) => {
  riseminaDatabase();
  await accedi(page);
});

async function vaiAlMesePersonale(page, etichetta: string) {
  await page.goto('/budget');
  await page.getByRole('button', { name: 'Cambia mese' }).click();
  await page.getByRole('menuitem', { name: new RegExp(etichetta) }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(etichetta);
}

test('il caso 300/150: la spesa condivisa e il conguaglio arrivano da soli', async ({ page }) => {
  await vaiAlMesePersonale(page, MESE_PRECEDENTE);
  const principale = page.getByRole('main');

  await expect(principale).toContainText('300,00'); // uscita derivata, importo intero
  await expect(principale).toContainText('150,00'); // conguaglio incassato
  await expect(principale).toContainText('-150,00'); // saldo reale
  await expect(principale).toContainText('Spesa casa'); // marcata come derivata
  await expect(principale).toContainText('Conguaglio');
});

test('le voci derivate sono in sola lettura', async ({ page }) => {
  await page.goto('/budget');
  // Niente menu azioni e interruttore bloccato: non si toccano da qui.
  await expect(page.getByRole('button', { name: 'Azioni su Affitto settembre' })).toHaveCount(0);
  await expect(
    page.getByRole('switch', { name: 'Segna Affitto settembre come pagata' }).first(),
  ).toBeDisabled();
});

test('una spesa condivisa nuova compare fra le uscite personali una volta sola', async ({ page }) => {
  await page.goto('/mesi/spese');
  await page.getByRole('button', { name: 'Aggiungi spesa' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Descrizione').fill('Bolletta luce');
  await dialogo.getByRole('textbox', { name: 'Importo' }).fill('40,00');
  await dialogo.getByLabel('Categoria').selectOption('Bollette');
  await dialogo.getByLabel('Pagato da').selectOption({ label: 'Giuseppe' });
  await dialogo.getByRole('button', { name: 'Aggiungi spesa' }).click();
  await expect(page.getByRole('main')).toContainText('totale 1240,00');

  await page.goto('/budget');
  const righe = page.getByRole('row', { name: /Bolletta luce/ });
  await expect(righe).toHaveCount(1); // una sola volta: nessun doppio conteggio
  await expect(page.getByRole('main')).toContainText('1110,00'); // uscite 1070 + 40
});

test('modificare la spesa di casa aggiorna la voce personale', async ({ page }) => {
  await page.goto('/mesi/spese');
  await page.getByRole('button', { name: 'Azioni su Spesa settimanale' }).click();
  await page.getByRole('menuitem', { name: 'Modifica' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Importo' }).fill('130,00');
  await page.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(page.getByRole('main')).toContainText('totale 1230,00');

  await page.goto('/budget');
  await expect(page.getByRole('main')).toContainText('1100,00'); // uscite 1070 + 30
});

test('cestinare la spesa di casa toglie la voce personale, ripristinarla la rimette', async ({
  page,
}) => {
  await page.goto('/mesi/spese');
  await page.getByRole('button', { name: 'Azioni su Spesa settimanale' }).click();
  await page.getByRole('menuitem', { name: 'Elimina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /elimina/i }).click();
  await expect(page.getByRole('row', { name: /Spesa settimanale/ })).toHaveCount(0);

  await page.goto('/budget');
  await expect(page.getByRole('row', { name: /Spesa settimanale/ })).toHaveCount(0);
  await expect(page.getByRole('main')).toContainText('970,00'); // uscite 1070 - 100

  // --- ripristino dal cestino ---
  await page.goto('/cestino');
  await page.getByRole('button', { name: 'Ripristina' }).first().click();
  await page.goto('/budget');
  await expect(page.getByRole('row', { name: /Spesa settimanale/ }).first()).toBeVisible();
  await expect(page.getByRole('main')).toContainText('1070,00');
});
