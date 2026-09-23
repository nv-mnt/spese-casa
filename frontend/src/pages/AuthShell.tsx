/** Cornice comune a login e registrazione: pannello illustrato + modulo. */

import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

const PUNTI = [
  { emoji: '\u{1F91D}', testo: 'Ogni spesa si divide a metà, senza discussioni' },
  { emoji: '\u{1F4CA}', testo: 'Vedi subito dove sono finiti i soldi' },
  { emoji: '\u{1F504}', testo: 'Le spese fisse si ricompilano da sole' },
];

/* Bollicine decorative sparse sul pannello di sinistra. */
const BOLLE = [
  { classe: 'left-[8%] top-[18%] size-24 bg-accent', ritardo: '0s' },
  { classe: 'right-[12%] top-[10%] size-16 bg-secondary', ritardo: '0.8s' },
  { classe: 'left-[18%] bottom-[14%] size-20 bg-warning', ritardo: '1.6s' },
  { classe: 'right-[6%] bottom-[26%] size-28 bg-primary', ritardo: '2.4s' },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Pannello illustrato: visibile da large in su */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r-3 border-ink bg-sidebar p-10 text-sidebar-foreground lg:flex">
        {BOLLE.map((bolla) => (
          <span
            key={bolla.classe}
            className={`pointer-events-none absolute animate-float rounded-full border-2 border-ink/20 opacity-50 ${bolla.classe}`}
            style={{ animationDelay: bolla.ritardo }}
            aria-hidden="true"
          />
        ))}

        <div className="relative flex items-center gap-3">
          <span
            className="flex size-12 items-center justify-center rounded-full border-2 border-ink
                       bg-primary text-2xl shadow-sticker"
            aria-hidden="true"
          >
            &#127968;
          </span>
          <div>
            <p className="font-display text-lg font-extrabold">Spese Casa</p>
            <p className="text-2xs font-semibold text-sidebar-muted">
              I conti di casa, senza mal di testa
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Chi ha pagato cosa?
            <br />
            <span className="inline-block rounded-full border-2 border-ink bg-accent px-3 py-0.5 shadow-sticker">
              Lo sappiamo noi!
            </span>
          </h2>
          <p className="mt-4 text-sm font-semibold leading-relaxed text-sidebar-muted">
            Segna le spese del mese, guarda il grafico e chiudi il conto con un tocco.
          </p>
          <ul className="mt-7 space-y-3">
            {PUNTI.map((punto) => (
              <li
                key={punto.testo}
                className="flex items-center gap-3 rounded-full border-2 border-ink bg-card px-3.5
                           py-2 text-sm font-bold text-foreground shadow-sticker-sm"
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {punto.emoji}
                </span>
                {punto.testo}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-2xs font-bold text-sidebar-muted">
          &#128274; I vostri dati restano sul vostro server.
        </p>
      </aside>

      {/* Modulo */}
      <main className="grid-backdrop relative flex items-center justify-center bg-background px-4 py-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[26rem]">
          <div className="mb-6 flex items-center gap-3 lg:block">
            <span
              className="flex size-14 shrink-0 animate-float items-center justify-center
                         rounded-full border-2 border-ink bg-primary text-3xl shadow-sticker
                         lg:mb-4"
              aria-hidden="true"
            >
              &#128176;
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-extrabold text-foreground">{title}</h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="animate-pop-in rounded-blob border-3 border-ink bg-card p-6 shadow-sticker-xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
