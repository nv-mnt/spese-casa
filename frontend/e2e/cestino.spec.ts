/** Cestino: si elimina, si ripensa, si butta per sempre. */

import { accedi, expect, riseminaDatabase, test, UTENTE_B } from './helpers';

test.beforeEach(async ({ page }) => {
  riseminaDatabase();
  await accedi(page);
});

async function cestinaSpesa(page, nome: string) {
  await page.goto('/mesi/spese');
  await page.getByRole('button', { name: `Azioni su ${nome}` }).click();
  await page.getByRole('menuitem', { name: 'Elimina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /elimina/i }).click();
  await expect(page.getByRole('row', { name: new RegExp(nome) })).toHaveCount(0);
}

test('quel che si elimina sparisce dai conti ma resta nel cestino', async ({ page }) => {
  await cestinaSpesa(page, 'Detersivi');
  await page.goto('/mesi');
  await expect(page.getByRole('main')).toContainText('1000,00'); // 1200 - 200

  await page.goto('/cestino');
  await expect(page.getByRole('main')).toContainText('Detersivi');
});

test('ripristinare riporta la voce nei conti', async ({ page }) => {
  await cestinaSpesa(page, 'Detersivi');
  await page.goto('/cestino');
  await page.getByRole('button', { name: 'Ripristina' }).first().click();
  await expect(page.getByRole('main')).toContainText('Cestino vuoto');

  await page.goto('/mesi');
  await expect(page.getByRole('main')).toContainText('1200,00');
});

test('eliminare per sempre svuota il cestino', async ({ page }) => {
  await cestinaSpesa(page, 'Detersivi');
  await page.goto('/cestino');
  await page.getByRole('button', { name: /Elimina definitivamente/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /per sempre/i }).click();
  await expect(page.getByRole('main')).toContainText('Cestino vuoto');

  await page.goto('/mesi');
  await expect(page.getByRole('main')).toContainText('1000,00');
});

test('il cestino personale mostra solo le proprie voci', async ({ page }) => {
  // Giuseppe cestina una sua uscita personale.
  await page.goto('/budget');
  await page.getByRole('button', { name: 'Azioni su Palestra' }).click();
  await page.getByRole('menuitem', { name: 'Elimina' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /elimina/i }).click();
  await page.goto('/cestino');
  await expect(page.getByRole('main')).toContainText('Palestra');

  // Angela non deve vederla.
  await page.getByRole('button', { name: 'Menu utente' }).click();
  await page.getByRole('menuitem', { name: 'Esci' }).click();
  await accedi(page, UTENTE_B);
  await page.goto('/cestino');
  await expect(page.getByRole('main')).not.toContainText('Palestra');
});
