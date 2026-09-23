import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from '@/App';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/context/AuthContext';
import { MeseProvider } from '@/context/MeseContext';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      // Senza questo, offline (o quando il browser *crede* di esserlo) query e
      // tentativi restano "in pausa" per sempre: la pagina mostra lo scheletro
      // all'infinito invece dello stato d'errore. Meglio provare e fallire.
      networkMode: 'always',
    },
    mutations: {
      // Stessa ragione, ma qui si vedeva di piu': offline la mutazione non
      // partiva nemmeno, quindi l'interceptor non poteva dire "Sei offline" e
      // il form restava aperto in silenzio.
      networkMode: 'always',
    },
  },
});

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root non trovato');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200} skipDelayDuration={300}>
          {/* Future flag gia' attivi: stesso comportamento di React Router 7
              e console pulita (senza, il router stampa due avvisi a ogni avvio). */}
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <ToastProvider>
              <AuthProvider>
                <MeseProvider>
                  <WorkspaceProvider>
                    <App />
                  </WorkspaceProvider>
                </MeseProvider>
              </AuthProvider>
            </ToastProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
