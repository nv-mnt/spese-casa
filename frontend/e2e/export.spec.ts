/** Export CSV dei due registri. */

import { readFileSync } from 'node:fs';

import { accedi, expect, riseminaDatabase, test } from './helpers';

test.beforeAll(() => riseminaDatabase());

test.beforeEach(async ({ page }) => {
  await accedi(page);
});

test('il CSV delle spese di casa contiene le righe del mese', async ({ page }) => {
  const scarico = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta CSV' }).click();
  const file = await scarico;
  expect(file.suggestedFilename()).toMatch(/\.csv$/i);

  const percorso = await file.path();
  const testo = readFileSync(percorso!, 'utf8');
  expect(testo).toContain('Affitto settembre');
  expect(testo).toContain('Detersivi');
});

test('il CSV del budget personale contiene entrate e uscite', async ({ page }) => {
  await page.goto('/budget');
  const scarico = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta CSV' }).click();
  const file = await scarico;
  const testo = readFileSync((await file.path())!, 'utf8');
  expect(testo).toContain('Stipendio');
  expect(testo).toContain('Palestra');
});
