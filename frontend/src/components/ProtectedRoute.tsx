/** Route accessibili solo da autenticati; le altre reindirizzano al login. */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingState label="Verifico la sessione…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Login e registrazione: chi e' gia' dentro va alla lista periodi. */
export function PublicOnlyRoute() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return <LoadingState label="Verifico la sessione…" />;
  if (isAuthenticated) return <Navigate to="/mesi" replace />;
  return <Outlet />;
}
