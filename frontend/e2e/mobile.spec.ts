/**
 * I flussi principali visti dal telefono.
 *
 * Sotto i 640px le tabelle diventano schede e la barra laterale un drawer:
 * qui si verifica che le stesse cose si possano comunque fare.
 */

import {
  accedi,
  expect,
  navigazione,
  riseminaDatabase,
  scegliMese,
  test,
  voce,
} from './helpers';

test.beforeEach(async ({ page }) => {
  riseminaDatabase();
  await accedi(page);
});

test('il riepilogo del mese si legge anche sullo schermo stretto', async ({
  page,
  erroriConsole,
}) => {
  const principale = page.getByRole('main');
  await expect(principale).toContainText('Settembre 2026');
  await expect(principale).toContainText('1200,00');
  await expect(principale).toContainText('550,00');
  await expect(principale).toContainText('Angela deve a Giuseppe');
  expect(erroriConsole).toEqual([]);
});

test('dal telefono si aggiunge una spesa e i totali si aggiornano', async ({ page }) => {
  await page.goto('/mesi/spese');
  await expect(page.getByRole('main')).toContainText('totale 1200,00');

  await page.getByRole('button', { name: 'Aggiungi spesa' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Descrizione').fill('Gelato');
  await dialogo.getByRole('textbox', { name: 'Importo' }).fill('12,00');
  await dialogo.getByLabel('Pagato da').selectOption({ label: 'Angela' });
  await dialogo.getByRole('button', { name: 'Aggiungi spesa' }).click();

  await expect(voce(page, 'Gelato')).toHaveCount(1);
  await expect(page.getByRole('main')).toContainText('totale 1212,00');

  // E si rimuove, sempre dalla scheda.
  await page.getByRole('button', { name: 'Azioni su Gelato' }).click();
  await page.getByRole('menuitem', { name: 'Elimina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /elimina/i }).click();
  await expect(page.getByRole('main')).toContainText('totale 1200,00');
});

test('il drawer si apre, porta a una pagina e si richiude', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'il drawer esiste solo sul telefono');

  await page.getByRole('button', { name: 'Apri la navigazione' }).click();
  await expect(navigazione(page)).toBeVisible();

  await navigazione(page).getByRole('link', { name: /Andamento/ }).click();
  await expect(page).toHaveURL(/\/mesi\/andamento$/);
  // Cambiata pagina, il drawer non resta aperto sopra il contenuto.
  await expect(navigazione(page)).toBeHidden();
});

test('dal telefono si cambia mese e la vista segue', async ({ page }) => {
  await scegliMese(page, 'Agosto 2026');
  await expect(page.getByRole('main')).toContainText('Agosto 2026');
  await expect(page.getByRole('main')).toContainText('300,00');
});

test('il budget personale resta usabile sullo schermo stretto', async ({ page }) => {
  await page.goto('/budget');
  const principale = page.getByRole('main');
  await expect(principale).toContainText('2100,00');
  await expect(principale).toContainText('1050,00');

  await page.getByRole('switch', { name: 'Segna Libro come pagata' }).first().click();
  await expect(principale).toContainText('1030,00');
});
