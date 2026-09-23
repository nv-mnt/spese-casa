/**
 * Workspace attivo: "Spese casa" oppure "Spese personali".
 *
 * Non e' una preferenza a se' stante: lo detta il percorso, perche' un link
 * diretto o un ricaricamento devono aprire il workspace giusto. Le pagine
 * comuni a entrambi (Impostazioni, Cestino) non lo cambiano: si resta in
 * quello da cui si e' arrivati, cosi' tornando indietro si ritrova la stessa
 * barra laterale.
 *
 * All'avvio si parte da "casa", come da specifica.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type Workspace = 'casa' | 'personale';

interface WorkspaceContextValue {
  workspace: Workspace;
  /** Percorso della dashboard del workspace attivo (la sua landing). */
  home: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** Il workspace scritto nel percorso, o `null` se la pagina vale per entrambi. */
function dalPercorso(pathname: string): Workspace | null {
  if (pathname === '/budget' || pathname.startsWith('/budget/')) return 'personale';
  if (pathname === '/mesi' || pathname.startsWith('/mesi/')) return 'casa';
  return null;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const dedotto = dalPercorso(pathname);
  const [workspace, setWorkspace] = useState<Workspace>(dedotto ?? 'casa');

  // Allineamento durante il render (non in un effetto): la barra laterale non
  // deve mai comparire, nemmeno per un frame, con le voci dell'altro workspace.
  if (dedotto && dedotto !== workspace) setWorkspace(dedotto);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspace, home: workspace === 'personale' ? '/budget' : '/mesi' }),
    [workspace],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace deve essere usato dentro <WorkspaceProvider>');
  return ctx;
}
