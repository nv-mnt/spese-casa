/**
 * Rete di sicurezza attorno alle pagine.
 *
 * Un errore di rendering dentro una vista non deve portarsi via tutta l'app:
 * qui viene fermato, mostrato in modo leggibile e la navigazione (sidebar,
 * topbar) resta viva, cosi' si puo' semplicemente andare da un'altra parte.
 *
 * Si azzera al cambio di `chiave` (il percorso corrente): cambiando pagina
 * l'errore precedente non resta appiccicato.
 */

import { RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  /** Cambiandola, il boundary si azzera (di solito il percorso corrente). */
  chiave?: string;
}

interface State {
  errore: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { errore: null };

  static getDerivedStateFromError(errore: Error): State {
    return { errore };
  }

  componentDidUpdate(prev: Props) {
    // Nuova pagina, nuova possibilita': l'errore vecchio non ha piu' senso.
    if (prev.chiave !== this.props.chiave && this.state.errore) {
      this.setState({ errore: null });
    }
  }

  componentDidCatch(errore: Error, info: ErrorInfo) {
    // Lo stack completo serve per capire cos'e' successo davvero.
    console.error('Errore nella pagina:', errore, info.componentStack);
  }

  private riprova = () => this.setState({ errore: null });

  render() {
    const { errore } = this.state;
    if (!errore) return this.props.children;

    return (
      <Card className="bg-destructive-subtle">
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span
            className="flex size-14 animate-wiggle items-center justify-center rounded-full
                       border-2 border-ink bg-destructive text-2xl shadow-sticker"
            aria-hidden="true"
          >
            &#128165;
          </span>
          <p className="font-display text-base font-bold text-foreground">
            Questa pagina si &egrave; impuntata
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Il resto dell&apos;app funziona: puoi cambiare sezione dal menu, oppure riprovare.
          </p>
          <p className="max-w-md break-words font-mono text-2xs text-muted-foreground">
            {errore.message}
          </p>
          <Button variant="outline" size="sm" onClick={this.riprova}>
            <RotateCcw />
            Riprova
          </Button>
        </div>
      </Card>
    );
  }
}
