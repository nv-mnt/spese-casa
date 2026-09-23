/**
 * Navigazione dopo il refactor a due workspace, e le regressioni gia' chiuse
 * che devono restare chiuse.
 */

import {
  accedi,
  apriNavigazione,
  expect,
  navigazione,
  riseminaDatabase,
  scegliMese,
  test,
} from './helpers';

test.beforeAll(() => riseminaDatabase());

test.beforeEach(async ({ page }) => {
  await accedi(page);
});

test('il menu utente porta al budget personale, sopra Impostazioni ed Esci', async ({ page }) => {
  await page.getByRole('button', { name: 'Menu utente' }).click();
  const voci = page.getByRole('menuitem');
  await expect(voci).toHaveText([/Spese personali/, /Impostazioni/, /Esci/]);

  await voci.first().click();
  await expect(page).toHaveURL(/\/budget$/);
  await expect(page.getByRole('main')).toContainText('Budget personale');
});

test('dal workspace personale si torna a quello di casa', async ({ page }) => {
  await page.goto('/budget');
  await page.getByRole('button', { name: 'Menu utente' }).click();
  await expect(page.getByRole('menuitem').first()).toHaveText(/Spese casa/);
  await page.getByRole('menuitem').first().click();
  await expect(page).toHaveURL(/\/mesi$/);
  await expect(page.getByRole('main')).toContainText('Dashboard mese');
});

test('la barra laterale e\' piatta, comincia da "Mesi" e non ha "Dashboard"', async ({ page }) => {
  await apriNavigazione(page);
  const voci = navigazione(page).getByRole('link');
  await expect(voci).toHaveText([/Mesi/, /Entrate comuni/, /Rimborso e saldo/, /Andamento/]);
  await expect(navigazione(page).getByRole('link', { name: /Dashboard/ })).toHaveCount(0);
});

test('nel workspace personale la barra mostra le sue voci', async ({ page }) => {
  await page.goto('/budget');
  await apriNavigazione(page);
  const voci = navigazione(page).getByRole('link');
  await expect(voci).toHaveText([/Mesi/, /Entrate/, /Uscite/, /Andamento/]);
});

test('il marchio riporta alla dashboard del workspace', async ({ page }) => {
  await page.goto('/mesi/elenco');
  await apriNavigazione(page);
  await page.getByTitle(/Vai alla dashboard/).locator('visible=true').first().click();
  await expect(page).toHaveURL(/\/mesi$/);
});

test('regressione: cambiando mese le voci del menu non si sdoppiano', async ({ page }) => {
  await apriNavigazione(page);
  const voci = navigazione(page).getByRole('link');
  await expect(voci).toHaveCount(4);

  for (const mese of ['Agosto 2026', 'Luglio 2026', 'Settembre 2026']) {
    await scegliMese(page, mese);
    await apriNavigazione(page);
    await expect(voci, `voci dopo ${mese}`).toHaveCount(4);
  }
});

test('regressione: una sola voce attiva alla volta', async ({ page }) => {
  for (const rotta of ['/mesi', '/mesi/elenco', '/mesi/andamento']) {
    await page.goto(rotta);
    await apriNavigazione(page);
    const attive = navigazione(page).locator('a[aria-current="page"]');
    await expect(attive, `su ${rotta}`).toHaveCount(rotta === '/mesi' ? 0 : 1);
  }
});

test('regressione: "Andamento" non blocca la barra laterale', async ({ page }) => {
  await page.goto('/mesi/andamento');
  await apriNavigazione(page);
  // Tutte le voci restano cliccabili: nessuna disabilitata.
  await expect(navigazione(page).locator('[aria-disabled="true"]')).toHaveCount(0);
  await navigazione(page).getByRole('link', { name: /Mesi/ }).click();
  await expect(page).toHaveURL(/\/mesi\/elenco$/);
});

test('regressione: all\'avvio si vede il mese corrente in tutte e due le sezioni', async ({
  page,
}) => {
  await expect(page.getByRole('main')).toContainText('Settembre 2026');
  await page.goto('/budget');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settembre 2026');
});

test('regressione: il mese scelto resta lo stesso cambiando workspace', async ({ page }) => {
  await scegliMese(page, 'Luglio 2026');
  await expect(page.getByRole('main')).toContainText('Luglio 2026');

  await page.getByRole('button', { name: 'Menu utente' }).click();
  await page.getByRole('menuitem').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Luglio 2026');

  await page.getByRole('button', { name: 'Menu utente' }).click();
  await page.getByRole('menuitem').first().click();
  await expect(page.getByRole('main')).toContainText('Luglio 2026');
});

test('un mese che in una sezione non esiste mostra lo stato vuoto, senza ripieghi', async ({
  page,
}) => {
  // Il budget personale di Angela non ha Luglio: si deve vedere il vuoto.
  await page.goto('/mesi/elenco');
  await page.getByRole('button', { name: 'Nuovo mese' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome del periodo').fill('Marzo 2027');
  await dialogo.getByRole('button', { name: /Crea/ }).click();
  // Creato il mese l'app ci porta dentro: da li' il mese globale e' quello.
  await expect(page).toHaveURL(/\/mesi\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marzo 2027');

  await scegliMese(page, 'Marzo 2027');

  // Il salto va fatto dentro l'app: ricaricare la pagina riporta al mese
  // corrente, che e' il comportamento voluto all'avvio.
  await page.getByRole('button', { name: 'Menu utente' }).click();
  await page.getByRole('menuitem').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marzo 2027');
  await expect(page.getByRole('main')).toContainText(/non è ancora aperto/);
});

test('ricaricando la pagina si riparte dal mese corrente', async ({ page }) => {
  await scegliMese(page, 'Luglio 2026');
  await expect(page.getByRole('main')).toContainText('Luglio 2026');

  await page.reload();
  await expect(page.getByRole('main')).toContainText('Settembre 2026');
});
