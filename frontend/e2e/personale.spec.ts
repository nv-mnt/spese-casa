/**
 * Budget personale: privato, con la sua aritmetica.
 *   entrate 2100, uscite 1070 (di cui 20 in sospeso)
 *   -> saldo reale 1050, dopo le sospese 1030.
 */

import { accedi, expect, riseminaDatabase, test, UTENTE_B } from './helpers';

test.beforeEach(async ({ page }) => {
  riseminaDatabase();
  await accedi(page);
  await page.goto('/budget');
});

test('i saldi personali tornano', async ({ page, erroriConsole }) => {
  const principale = page.getByRole('main');
  await expect(principale).toContainText('2100,00'); // entrate totali
  await expect(principale).toContainText('1070,00'); // uscite totali
  await expect(principale).toContainText('1050,00'); // saldo reale = 2100 - 1050 pagate
  await expect(principale).toContainText('1030,00'); // dopo le sospese
  await expect(principale).toContainText('di cui 20,00 € in sospeso');
  expect(erroriConsole).toEqual([]);
});

test("aggiungere un'entrata alza entrate totali e saldo", async ({ page }) => {
  await page.getByRole('heading', { name: 'Entrate' }).locator('..').getByRole('button', { name: 'Aggiungi' }).click();
  const nuovaEntrata = page.getByRole('dialog');
  await nuovaEntrata.getByLabel('Dettaglio').fill('Regalo');
  await nuovaEntrata.getByRole('textbox', { name: 'Importo' }).fill('100,00');
  await nuovaEntrata.getByRole('button', { name: /Aggiungi entrata/ }).click();

  const principale = page.getByRole('main');
  await expect(principale).toContainText('2200,00');
  await expect(principale).toContainText('1150,00'); // saldo reale
});

test("un'uscita in sospeso pesa solo sul saldo previsto", async ({ page }) => {
  await page.getByRole('heading', { name: 'Uscite' }).locator('..').getByRole('button', { name: 'Aggiungi' }).click();
  const nuovaUscita = page.getByRole('dialog');
  await nuovaUscita.getByLabel('Negozio / Dettaglio').fill('Scarpe');
  await nuovaUscita.getByRole('textbox', { name: 'Importo' }).fill('30,00');
  await nuovaUscita.getByRole('button', { name: /Aggiungi uscita/ }).click();

  const principale = page.getByRole('main');
  await expect(principale).toContainText('1100,00'); // uscite totali 1070 + 30
  await expect(principale).toContainText('1050,00'); // saldo reale invariato
  await expect(principale).toContainText('1000,00'); // dopo le sospese: 2100 - 1100
});

test('il segno "pagata" sposta i soldi dal previsto al reale', async ({ page }) => {
  await page.getByRole('switch', { name: 'Segna Libro come pagata' }).click();
  const principale = page.getByRole('main');
  await expect(principale).toContainText('1030,00'); // saldo reale: 20 in meno
  await expect(principale).toContainText('di cui 0,00 € in sospeso');
});

test('modifica ed eliminazione di una voce personale', async ({ page }) => {
  await page.getByRole('button', { name: 'Azioni su Palestra' }).click();
  await page.getByRole('menuitem', { name: 'Modifica' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Importo' }).fill('60,00');
  await page.getByRole('button', { name: 'Salva modifiche' }).click();
  await expect(page.getByRole('main')).toContainText('1080,00'); // uscite 1070 + 10

  await page.getByRole('button', { name: 'Azioni su Palestra' }).click();
  await page.getByRole('menuitem', { name: 'Elimina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /elimina/i }).click();
  await expect(page.getByRole('row', { name: /Palestra/ })).toHaveCount(0);
  await expect(page.getByRole('main')).toContainText('1020,00'); // 1080 - 60
});

test('ognuno vede solo il proprio budget', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu utente' }).click();
  await page.getByRole('menuitem', { name: 'Esci' }).click();
  await accedi(page, UTENTE_B);
  await page.goto('/budget');

  const principale = page.getByRole('main');
  // Angela non vede lo stipendio di Giuseppe, ma vede la sua spesa riflessa.
  await expect(principale).not.toContainText('Stipendio');
  await expect(principale).not.toContainText('Palestra');
  await expect(principale).toContainText('Detersivi');
});
