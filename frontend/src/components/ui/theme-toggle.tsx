import { Monitor, Moon, Sun } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, type Theme } from '@/components/ui/theme-provider';
import { cn } from '@/lib/utils';

const OPZIONI: { valore: Theme; etichetta: string; Icon: typeof Sun }[] = [
  { valore: 'light', etichetta: 'Giorno', Icon: Sun },
  { valore: 'dark', etichetta: 'Notte', Icon: Moon },
  { valore: 'system', etichetta: 'Come il sistema', Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          `inline-flex size-9 items-center justify-center rounded-full border-2 border-ink
           bg-warning text-warning-foreground shadow-sticker-sm transition-all duration-150
           ease-boing hover:-translate-y-[2px] hover:rotate-12 hover:shadow-sticker
           active:translate-y-0 active:shadow-pop
           focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40`,
          className,
        )}
        aria-label="Cambia tema"
      >
        {resolved === 'dark' ? (
          <Moon className="size-4" strokeWidth={2.5} />
        ) : (
          <Sun className="size-4" strokeWidth={2.5} />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aspetto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPZIONI.map(({ valore, etichetta, Icon }) => (
          <DropdownMenuItem
            key={valore}
            onSelect={() => setTheme(valore)}
            className={cn(theme === valore && 'bg-primary text-primary-foreground')}
          >
            <Icon />
            {etichetta}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
