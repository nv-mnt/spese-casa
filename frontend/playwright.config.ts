/**
 * Configurazione dei test end-to-end.
 *
 * Tre server, tutti su porte dedicate ai test (mai quelle di sviluppo):
 *  - 8099  API FastAPI su un SQLite seminato da capo;
 *  - 5199  Vite in sviluppo, per la gran parte dei flussi;
 *  - 4199  `vite preview` sulla build di produzione, per i test della PWA
 *          (in sviluppo il service worker non c'e').
 *
 * I test girano in fila (un worker): condividono un database e si aspettano
 * numeri precisi, quindi il parallelismo darebbe solo falsi rossi.
 */

import { defineConfig, devices } from '@playwright/test';

const API = 'http://127.0.0.1:8099';
const WEB = 'http://127.0.0.1:5199';
export const ANTEPRIMA = 'http://127.0.0.1:4199';

/** I file che girano anche su telefono. */
const SU_TELEFONO = [
  'auth.spec.ts',
  'mobile.spec.ts',
  'navigazione.spec.ts',
  'pwa.spec.ts',
  'qualita.spec.ts',
];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    // Sul telefono gira il sottoinsieme che ha senso li': navigazione col
    // drawer, flussi principali nel layout a schede, PWA e responsivita'.
    // Il resto vive su desktop, dove le tabelle sono tabelle.
    {
      // ~393px: un telefono Android di taglia media.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: SU_TELEFONO,
    },
    {
      // WebKit su viewport iPhone: e' il motore di Safari.
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'] },
      testMatch: SU_TELEFONO,
    },
  ],
  webServer: [
    {
      command: 'bash scripts/run_e2e_api.sh',
      cwd: '../backend',
      url: `${API}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npx vite --port 5199 --strictPort --host 127.0.0.1',
      url: WEB,
      env: { VITE_PROXY_TARGET: API },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npx vite build && npx vite preview --port 4199 --strictPort --host 127.0.0.1',
      url: ANTEPRIMA,
      env: { VITE_PROXY_TARGET: API },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
