/** Faccino del membro: iniziali su pastiglia colorata, con contorno a pennarello. */

import { cn } from '@/lib/utils';

const DIMENSIONI = {
  xs: 'size-6 text-[10px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-12 text-base',
} as const;

export function MemberAvatar({
  nome,
  iniziali,
  colore,
  size = 'md',
  className,
}: {
  nome: string;
  iniziali: string;
  colore: string;
  size?: keyof typeof DIMENSIONI;
  className?: string;
}) {
  return (
    <span
      className={cn(
        `relative inline-flex shrink-0 items-center justify-center rounded-full border-2
         border-ink font-display font-extrabold uppercase text-white shadow-sticker-sm`,
        DIMENSIONI[size],
        className,
      )}
      style={{ backgroundColor: colore }}
      title={nome}
      aria-hidden="true"
    >
      {iniziali}
      {/* Riflesso lucido: il dettaglio che rende "chibi" una pastiglia. */}
      <span className="absolute left-[18%] top-[15%] size-[22%] rounded-full bg-white/60" />
    </span>
  );
}

/** Gruppo di faccini sovrapposti. */
export function MemberAvatarGroup({
  membri,
  size = 'sm',
}: {
  membri: { id: number; nome: string; iniziali: string; colore: string }[];
  size?: keyof typeof DIMENSIONI;
}) {
  return (
    <span className="flex -space-x-2">
      {membri.map((m) => (
        <MemberAvatar key={m.id} {...m} size={size} />
      ))}
    </span>
  );
}
