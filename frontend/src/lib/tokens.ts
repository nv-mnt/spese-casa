/** Persistenza dei token JWT in localStorage (tollerante ai browser che la bloccano). */

const ACCESS_KEY = 'spese-casa.access_token';
const REFRESH_KEY = 'spese-casa.refresh_token';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* modalita' privata o storage disabilitato: si resta in sessione */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}

export const tokenStore = {
  getAccess: () => safeGet(ACCESS_KEY),
  getRefresh: () => safeGet(REFRESH_KEY),
  set(access: string, refresh: string) {
    safeSet(ACCESS_KEY, access);
    safeSet(REFRESH_KEY, refresh);
  },
  clear() {
    safeRemove(ACCESS_KEY);
    safeRemove(REFRESH_KEY);
  },
};
