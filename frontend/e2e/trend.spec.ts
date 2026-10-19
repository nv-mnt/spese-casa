/** Andamenti multi-mese, nelle due sezioni. */

import {
  accedi,
  expect,
  MESE_CORRENTE,
  MESE_PRECEDENTE,
  MESE_VECCHIO,
  riseminaDatabase,
  test,
} from './helpers';

test.beforeAll(() => riseminaDatabase());

test.beforeEach(async ({ page }) => {
  await accedi(page);
});

test('andamento delle spese di casa: mesi a confronto e filtri', async ({ page, erroriConsole }) => {
  await page.goto('/mesi/andamento');
  const principale = page.getByRole('main');
  await expect(principale).toContainText('Andamento');
  // I tre mesi del seed compaiono nel confronto.
  await expect(principale).toContainText(MESE_CORRENTE);
  await expect(principale).toContainText(MESE_PRECEDENTE);
  await expect(principale).toContainText(MESE_VECCHIO);

  await page.getByRole('combobox').first().selectOption({ label: 'Ultimi 3 mesi' });
  await expect(principale).toContainText(MESE_CORRENTE);

  // Filtro per categoria: l'affitto c'e' in due mesi su tre.
  await page.getByRole('combobox').nth(1).selectOption({ label: 'Affitto' });
  await expect(principale).toContainText('900,00');
  expect(erroriConsole).toEqual([]);
});

test('andamento del budget personale', async ({ page }) => {
  await page.goto('/budget/andamento');
  const principale = page.getByRole('main');
  await expect(principale).toContainText('Andamento');
  await expect(principale).toContainText(MESE_CORRENTE);
  await expect(principale).toContainText(MESE_PRECEDENTE);
});

test('il confronto col mese precedente mostra la variazione', async ({ page }) => {
  await page.goto('/mesi/andamento');
  // Settembre 1200 contro Agosto 300: la variazione e' in aumento.
  await expect(page.getByRole('main')).toContainText(/%/);
});
