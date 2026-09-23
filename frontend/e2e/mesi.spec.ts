/** Mesi: creazione, rinomina, elenco. */

import { accedi, expect, riseminaDatabase, test } from './helpers';

test.beforeEach(async ({ page }) => {
  riseminaDatabase();
  await accedi(page);
});

test("l'elenco riassume tutti i mesi", async ({ page }) => {
  await page.goto('/mesi/elenco');
  const principale = page.getByRole('main');
  await expect(principale).toContainText('3 mesi');
  await expect(principale).toContainText('1700,00'); // 200 + 300 + 1200
  await expect(page.getByRole('row', { name: /Settembre 2026/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Agosto 2026/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Luglio 2026/ })).toBeVisible();
});

test('un mese nuovo nasce vuoto e diventa quello selezionato', async ({ page }) => {
  await page.goto('/mesi/elenco');
  await page.getByRole('button', { name: 'Nuovo mese' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome del periodo').fill('Ottobre 2026');
  await dialogo.getByRole('button', { name: /Crea/ }).click();

  await expect(page).toHaveURL(/\/mesi\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ottobre 2026');
  await expect(page.getByRole('main')).toContainText('0,00');
  await expect(page.getByRole('button', { name: /Mese selezionato/ })).toHaveAttribute(
    'aria-label',
    /Ottobre 2026/,
  );
});

test('rinominare il mese dal titolo', async ({ page }) => {
  await page.getByRole('button', { name: 'Rinomina il mese' }).click();
  const campo = page.getByRole('textbox', { name: 'Rinomina il mese' });
  await campo.fill('Settembre 2026 (rivisto)');
  await campo.press('Enter');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settembre 2026 (rivisto)');
  // Regressione: il mese selezionato e' identificato dal nome, quindi dopo la
  // rinomina la selezione deve seguirlo. Prima restava sul vecchio nome e la
  // dashboard cadeva nello stato vuoto.
  await expect(page.getByRole('button', { name: /Mese selezionato/ })).toHaveAttribute(
    'aria-label',
    /Settembre 2026 \(rivisto\)/,
  );
  await expect(page.getByRole('main')).toContainText('1200,00');

  await page.goto('/mesi/elenco');
  await expect(page.getByRole('row', { name: /Settembre 2026 \(rivisto\)/ })).toBeVisible();
});

test.skip('archiviazione dell\'anno e consultazione dell\'Archivio', () => {
  // Funzione non presente nell'applicazione: l'entita' "Anno", l'archiviazione
  // in sola lettura e i riporti sul nuovo anno non sono mai stati implementati
  // (erano stati rinviati). Il test resta qui come promemoria.
});
