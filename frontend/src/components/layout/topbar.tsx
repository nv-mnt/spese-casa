/** Barra superiore: toggle sidebar, briciole di pane, faccini, menu utente. */

import {
  ChevronRight,
  House,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MemberAvatarGroup } from '@/components/ui/member-avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useMembers } from '@/hooks/useMembers';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
  label: string;
  to?: string;
}

const PULSANTE_TONDO = `inline-flex size-9 items-center justify-center rounded-full border-2
  border-ink bg-card shadow-sticker-sm transition-all duration-150 ease-boing
  hover:-translate-y-[2px] hover:bg-primary hover:shadow-sticker
  active:translate-y-0 active:shadow-pop
  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40`;

export function Topbar({
  breadcrumbs,
  collassata,
  onToggleCollapse,
  onOpenMobile,
}: {
  breadcrumbs: Breadcrumb[];
  collassata: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}) {
  const { user, logout } = useAuth();
  const { data: members } = useMembers();
  const { workspace } = useWorkspace();
  const personale = workspace === 'personale';

  const iniziali = (user?.nome ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3
                 border-b-3 border-ink bg-background/90 px-4 backdrop-blur-md"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMobile}
          className={cn(PULSANTE_TONDO, 'lg:hidden')}
          aria-label="Apri la navigazione"
        >
          <Menu className="size-[18px]" strokeWidth={2.5} />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(PULSANTE_TONDO, 'hidden lg:inline-flex')}
              aria-label={collassata ? 'Espandi la navigazione' : 'Riduci la navigazione'}
            >
              {collassata ? (
                <PanelLeftOpen className="size-[18px]" strokeWidth={2.5} />
              ) : (
                <PanelLeftClose className="size-[18px]" strokeWidth={2.5} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {collassata ? 'Apri il menu' : 'Chiudi il menu'}
          </TooltipContent>
        </Tooltip>

        <nav aria-label="Percorso" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => {
              const ultimo = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
                  {i > 0 && (
                    <ChevronRight
                      className="size-3.5 shrink-0 text-muted-foreground"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  )}
                  {crumb.to && !ultimo ? (
                    <Link
                      to={crumb.to}
                      className="truncate font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'truncate',
                        ultimo
                          ? `rounded-full border-2 border-ink bg-secondary px-2.5 py-0.5
                             font-display text-xs font-bold text-secondary-foreground`
                          : 'font-semibold text-muted-foreground',
                      )}
                      aria-current={ultimo ? 'page' : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {members && members.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="mr-1 hidden sm:inline-flex">
                <MemberAvatarGroup membri={members} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {members.map((m) => m.nome).join(' e ')}
            </TooltipContent>
          </Tooltip>
        )}

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-card
                       py-1 pl-1 pr-3 shadow-sticker-sm transition-all duration-150 ease-boing
                       hover:-translate-y-[2px] hover:shadow-sticker
                       focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
            aria-label="Menu utente"
          >
            <span
              className="flex size-7 items-center justify-center rounded-full border-2 border-ink
                         bg-primary font-display text-2xs font-extrabold text-primary-foreground"
            >
              {iniziali}
            </span>
            <span className="hidden max-w-[10rem] truncate font-display text-sm font-bold text-foreground sm:block">
              {user?.nome}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <span className="block font-display text-sm font-extrabold text-foreground">
                {user?.nome}
              </span>
              <span className="block truncate text-xs font-semibold text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Cambio di workspace: da qui si entra nel budget personale e da
                li' si torna alle spese di casa. */}
            <DropdownMenuItem asChild>
              <Link to={personale ? '/mesi' : '/budget'}>
                {personale ? <House strokeWidth={2.5} /> : <Wallet strokeWidth={2.5} />}
                {personale ? 'Spese casa' : 'Spese personali'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/impostazioni">
                <UserRound strokeWidth={2.5} />
                Impostazioni
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={logout}>
              <LogOut strokeWidth={2.5} />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
