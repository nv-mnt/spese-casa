/**
 * Attrezzi comuni ai test E2E: utenti del seed, login, reset del database e
 * la guardia che tiene pulita la console del browser.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test as base, type Page } from '@playwright/test';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const RESET = path.resolve(QUI, '../../backend/scripts/reset_e2e.sh');

export const UTENTE_A = {
  email: 'giuseppe@e2etest.it',
  password: 'password123',
  nome: 'Giuseppe',
};
export const UTENTE_B = {
  email: 'angela@e2etest.it',
  password: 'password123',
  nome: 'Angela',
};

export const MESE_CORRENTE = 'Settembre 2026';
export const MESE_PRECEDENTE = 'Agosto 2026';
export const MESE_VECCHIO = 'Luglio 2026';

/** Riporta il database E2E ai numeri del seed. */
export function riseminaDatabase(): void {
  execFileSync('bash', [RESET], { stdio: 'pipe' });
}

/**
 * Messaggi di console che non contano come sporcizia: rumore di Vite in
 * sviluppo e fallimenti di rete voluti (i test negativi si aspettano 401/404).
 */
const RUMORE = [
  /Failed to load resource/i,
  /\[vite\]/i,
  /Download the React DevTools/i,
  /net::ERR_INTERNET_DISCONNECTED/i,
  /Failed to fetch/i,
  /the server responded with a status of/i,
];

interface Fixtures {
  /** Messaggi di errore/avviso raccolti dalla console della pagina. */
  erroriConsole: string[];
}

export const test = base.extend<Fixtures>({
  // Il parametro si chiama `usa` e non `use`: cosi' ESLint non lo scambia per
  // l'hook `use` di React e non lamenta le regole degli hook.
  erroriConsole: async ({ page }, usa) => {
    const raccolti: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error' && msg.type() !== 'warning') return;
      const testo = msg.text();
      if (RUMORE.some((r) => r.test(testo))) return;
      raccolti.push(`[${msg.type()}] ${testo}`);
    });
    page.on('pageerror', (err) => raccolti.push(`[pageerror] ${err.message}`));
    await usa(raccolti);
  },
});

export { expect };

/** Entra con un utente del seed e aspetta che l'app sia montata. */
export async function accedi(page: Page, utente = UTENTE_A): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(utente.email);
  await page.getByLabel('Password').fill(utente.password);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(page.getByRole('button', { name: 'Menu utente' })).toBeVisible();
}

/** Esce dall'app (il menu utente e' lo stesso su desktop e mobile). */
export async function esci(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menu utente' }).click();
  await page.getByRole('menuitem', { name: 'Esci' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/**
 * Importi: il formato italiano usa lo spazio unificatore prima dell'euro,
 * scomodo da scrivere nelle asserzioni. Qui si confronta solo la cifra.
 */
export function euro(valore: string): RegExp {
  return new RegExp(valore.replace(/\./g, '\\.').replace(/,/g, ','));
}

/**
 * Apre la barra laterale se serve.
 *
 * Su desktop c'e' gia'; su telefono e' un drawer. Se e' gia' aperto non si
 * tocca niente: cliccare di nuovo il pulsante finirebbe sotto il drawer.
 */
export async function apriNavigazione(page: Page): Promise<void> {
  const misure = page.viewportSize();
  if (!misure || misure.width >= 1024) return; // su desktop e' sempre li'

  const contenitore = drawerAperto(page);
  if ((await contenitore.getAttribute('aria-hidden')) === 'false') return;
  await page.getByRole('button', { name: 'Apri la navigazione' }).click();
  await expect(contenitore).toHaveAttribute('aria-hidden', 'false');
}

/**
 * Il drawer del telefono e' aperto?
 *
 * Si guarda l'attributo nel DOM e non l'albero di accessibilita': mentre un
 * menu a tendina e' aperto, Radix nasconde il resto della pagina agli
 * screen reader e `getByRole` non troverebbe piu' niente.
 */
function drawerAperto(page: Page) {
  return page.locator('[aria-label="Navigazione"][aria-modal]').locator('..');
}

/** Richiude il drawer del telefono (su desktop non c'e' niente da chiudere). */
export async function chiudiNavigazione(page: Page): Promise<void> {
  const misure = page.viewportSize();
  if (!misure || misure.width >= 1024) return;
  const contenitore = drawerAperto(page);
  if ((await contenitore.getAttribute('aria-hidden')) !== 'false') return;

  // Un tocco fuori dal drawer lo chiude.
  await page.mouse.click(misure.width - 8, Math.round(misure.height / 2));
  await expect(contenitore).toHaveAttribute('aria-hidden', 'true');
}

/** La barra laterale visibile (su mobile e' il drawer). */
export function navigazione(page: Page) {
  return page.getByRole('navigation', { name: 'Navigazione principale' }).last();
}

/**
 * Una voce di un elenco, comunque sia disegnata.
 *
 * Sopra i 640px le tabelle sono tabelle; sotto diventano schede. Questo
 * localizzatore prende quella che si vede davvero, cosi' gli stessi test
 * valgono su telefono e su desktop.
 */
export function voce(page: Page, testo: string) {
  const espressione = new RegExp(testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return page
    .getByRole('row', { name: espressione })
    .or(page.getByRole('listitem').filter({ hasText: testo }))
    .locator('visible=true');
}

/** Apre il selettore del mese (su telefono passa dal drawer). */
export async function apriMenuMese(page: Page): Promise<void> {
  await apriNavigazione(page);
  await page
    .getByRole('button', { name: /Mese selezionato/ })
    .locator('visible=true')
    .first()
    .click();
}

/** Sceglie un mese dal selettore e rimette a posto il drawer. */
export async function scegliMese(page: Page, etichetta: string): Promise<void> {
  await apriMenuMese(page);
  await page.getByRole('menuitem', { name: new RegExp(etichetta) }).click();

  // Sul telefono la scelta richiude anche il drawer, quindi l'indicatore non
  // e' piu' raggiungibile: lo si controlla solo quando e' ancora li'.
  const indicatore = page.getByRole('button', { name: /Mese selezionato/ }).first();
  if (await indicatore.isVisible()) {
    await expect(indicatore).toHaveAttribute('aria-label', new RegExp(etichetta));
  }
  await chiudiNavigazione(page);
}
