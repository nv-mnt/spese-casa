/** Stato di autenticazione condiviso: utente corrente, login, registrazione, logout. */

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authApi, type LoginPayload, type RegisterPayload } from '@/api/auth';
import { UNAUTHORIZED_EVENT } from '@/api/client';
import { tokenStore } from '@/lib/tokens';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  /** true finche' non si sa se il token salvato e' ancora valido. */
  initializing: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  /** Rilegge il profilo dal server (dopo un cambio di preferenze). */
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Ripristina la sessione da localStorage al primo mount.
  useEffect(() => {
    let annullato = false;

    async function ripristina() {
      if (!tokenStore.getAccess()) {
        setInitializing(false);
        return;
      }
      try {
        const profilo = await authApi.me();
        if (!annullato) setUser(profilo);
      } catch {
        tokenStore.clear();
        if (!annullato) setUser(null);
      } finally {
        if (!annullato) setInitializing(false);
      }
    }

    void ripristina();
    return () => {
      annullato = true;
    };
  }, []);

  // Il client Axios emette questo evento quando anche il refresh fallisce.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await authApi.login(payload);
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    setUser(await authApi.me());
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const tokens = await authApi.register(payload);
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    setUser(await authApi.me());
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.getAccess()) return;
    setUser(await authApi.me());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: user !== null,
      login,
      register,
      refresh,
      logout,
    }),
    [user, initializing, login, register, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
}
