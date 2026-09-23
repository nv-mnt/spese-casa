import { Badge } from '@/components/ui/badge';
import type { StatoSaldo } from '@/types';

const CONFIG: Record<
  StatoSaldo,
  { variant: 'neutral' | 'warning' | 'success'; emoji: string }
> = {
  in_pari: { variant: 'neutral', emoji: '\u{1F91D}' },
  da_saldare: { variant: 'warning', emoji: '\u{23F3}' },
  saldato: { variant: 'success', emoji: '\u{1F389}' },
};

export function StatusBadge({ stato, label }: { stato: StatoSaldo; label: string }) {
  const { variant, emoji } = CONFIG[stato];
  return (
    <Badge variant={variant}>
      <span aria-hidden="true">{emoji}</span>
      {label}
    </Badge>
  );
}
