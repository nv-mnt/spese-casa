/**
 * Spese casa: i conti del mese e il CRUD che li muove.
 *
 * Il seed mette numeri tondi (vedi tests_e2e/seed_e2e.py):
 *   Giuseppe 900 + 100, Angela 200, entrata comune 100 a Giuseppe
 *   -> totale 1200, netto 1100, quota 550, saldo 350 (Angela deve a Giuseppe).
 */

import { accedi, expect, riseminaDatabase, test } from './helpers';

test.beforeEach(async ({ page }) => {
  riseminaDatabase();
  await accedi(page);
});

test('il riepilogo del mese fa i conti giusti', async ({ page, erroriConsole }) => {
  const principale = page.getByRole('main');
  await expect(principale).toContainText('1200,00');
  await expect(principale).toContainText('550,00');
  await expect(principale).toContainText('350,00');
  await expect(principale).toContainText('1100,00');
  await expect(principale).toContainText('Angela deve a Giuseppe');
  // Contributi netti: pagato meno incassato.
  await expect(principale).toContainText('1000,00 € spesi − 100,00 € incassati');
  await expect(principale).toContainText('200,00 € spesi − 0,00 € incassati');
  expect(erroriConsole).toEqual([]);
});

test('i totali per categoria seguono le spese', async ({ page }) => {
  const categorie = page.getByRole('main');
  await expect(categorie).toContainText('Affitto');
  await expect(categorie).toContainText('900,00');
  await expect(categorie).toContainText('75,0%');
  await expect(categorie).toContainText('16,7%'); // Casa 200/1200
  await expect(categorie).toContainText('8,3%'); // Spesa 100/1200
});

test('aggiungere, modificare ed eliminare una spesa muove i totali', async ({ page }) => {
  await page.goto('/mesi/spese');
  await expect(page.getByRole('main')).toContainText('totale 1200,00');

  // --- creazione ---
  await page.getByRole('button', { name: 'Aggiungi spesa' }).click();
  const nuova = page.getByRole('dialog');
  await nuova.getByLabel('Descrizione').fill('Caffe di prova');
  await nuova.getByRole('textbox', { name: 'Importo' }).fill('10,00');
  await nuova.getByLabel('Categoria').selectOption('Svago');
  await nuova.getByLabel('Pagato da').selectOption({ label: 'Angela' });
  await nuova.getByRole('button', { name: 'Aggiungi spesa' }).click();
  await expect(page.getByRole('row', { name: /Caffe di prova/ })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('totale 1210,00');

  // --- modifica ---
  await page.getByRole('button', { name: 'Azioni su Caffe di prova' }).click();
  await page.getByRole('menuitem', { name: 'Modifica' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Importo' }).fill('20,00');
  await page.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(page.getByRole('main')).toContainText('totale 1220,00');

  // --- eliminazione (soft delete) ---
  await page.getByRole('button', { name: 'Azioni su Caffe di prova' }).click();
  await page.getByRole('menuitem', { name: 'Elimina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /elimina/i }).click();
  await expect(page.getByRole('row', { name: /Caffe di prova/ })).toHaveCount(0);
  await expect(page.getByRole('main')).toContainText('totale 1200,00');
});

test("un'entrata comune abbassa il netto da dividere", async ({ page }) => {
  await page.getByRole('button', { name: 'Aggiungi' }).first().click();
  const entrata = page.getByRole('dialog');
  await entrata.getByLabel('Descrizione').fill('Rimborso bolletta');
  await entrata.getByRole('textbox', { name: 'Importo' }).fill('50,00');
  await entrata.getByLabel('Ricevuto da').selectOption({ label: 'Angela' });
  await entrata.getByRole('button', { name: /Aggiungi|Salva/ }).click();

  const principale = page.getByRole('main');
  await expect(principale).toContainText('150,00'); // entrate comuni totali
  await expect(principale).toContainText('1050,00'); // netto 1200 - 150
  await expect(principale).toContainText('525,00'); // quota a testa
});

test('il rimborso versato riduce quel che resta da dare', async ({ page }) => {
  const campo = page.getByRole('textbox', { name: 'Già versato' });
  await campo.fill('100,00');
  await campo.press('Enter');
  await expect(page.getByRole('main')).toContainText('250,00'); // 350 - 100
});

test('i filtri del registro restringono le righe', async ({ page }) => {
  await page.goto('/mesi/spese');
  await page.getByRole('combobox', { name: 'Filtra per chi ha pagato' }).selectOption({ label: 'Angela' });
  await expect(page.getByRole('row', { name: /Detersivi/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Affitto settembre/ })).toHaveCount(0);
  await expect(page.getByRole('main')).toContainText('1 di 3');
});
