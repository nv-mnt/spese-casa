/**
 * Istanza Axios condivisa.
 *
 * - inietta l'access token in ogni richiesta;
 * - su 401 tenta **una sola volta** il refresh e riesegue la richiesta,
 *   accodando le chiamate concorrenti in attesa del nuovo token;
 * - se il refresh fallisce pulisce i token ed emette l'evento
 *   `spese-casa:unauthorized`, che l'AuthContext usa per fare logout.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { tokenStore } from '@/lib/tokens';

export const UNAUTHORIZED_EVENT = 'spese-casa:unauthorized';

/** Messaggio unico usato quando si prova a scrivere senza rete. */
export const OFFLINE_MESSAGE = 'Sei offline: modifiche non disponibili';

const METODI_DI_SCRITTURA = ['post', 'put', 'patch', 'delete'];

/** Endpoint che emettono i token: un 401 qui non si ripara con un refresh. */
const SENZA_RINNOVO = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/token'];

/** Errore sintetico, riconoscibile da `getErrorMessage`. */
export class OfflineError extends Error {
  constructor() {
    super(OFFLINE_MESSAGE);
    this.name = 'OfflineError';
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

/** Client separato per il refresh: non ha interceptor, evita ricorsioni. */
const refreshClient = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  // Le letture possono arrivare dalla cache del service worker; le scritture
  // no: meglio fermarle subito con un messaggio chiaro che vederle fallire
  // con un errore di rete generico.
  if (
    typeof navigator !== 'undefined' &&
    navigator.onLine === false &&
    METODI_DI_SCRITTURA.includes((config.method ?? 'get').toLowerCase())
  ) {
    throw new OfflineError();
  }

  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new Error('Nessun refresh token disponibile');

  const { data } = await refreshClient.post<{ access_token: string; refresh_token: string }>(
    '/auth/refresh',
    { refresh_token: refreshToken },
  );
  tokenStore.set(data.access_token, data.refresh_token);
  return data.access_token;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    // Solo gli endpoint che *emettono* i token restano fuori dal rinnovo:
    // ripeterli dopo un refresh non avrebbe senso e rischierebbe un ciclo.
    // `/auth/me` invece e' una lettura protetta come le altre e va ripetuta,
    // altrimenti un access token scaduto butta fuori chi ha ancora un refresh
    // token valido (cioe' a ogni riapertura dopo un'ora).
    const isCredenziali = SENZA_RINNOVO.some((rotta) => config?.url?.startsWith(rotta));

    if (error.response?.status !== 401 || !config || config._retry || isCredenziali) {
      return Promise.reject(error);
    }

    config._retry = true;
    try {
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const nuovoToken = await refreshPromise;
      refreshPromise = null;
      config.headers.Authorization = `Bearer ${nuovoToken}`;
      return api.request(config);
    } catch (refreshError) {
      refreshPromise = null;
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      return Promise.reject(refreshError);
    }
  },
);

/** Estrae un messaggio leggibile dagli errori FastAPI. */
export function getErrorMessage(
  error: unknown,
  fallback = 'Si è verificato un errore',
): string {
  if (error instanceof OfflineError) return OFFLINE_MESSAGE;
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const primo = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
      if (primo?.msg) {
        const campo = Array.isArray(primo.loc) ? primo.loc.at(-1) : undefined;
        return campo ? `${String(campo)}: ${primo.msg}` : primo.msg;
      }
    }
    if (error.code === 'ERR_NETWORK') return 'Backend non raggiungibile';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
