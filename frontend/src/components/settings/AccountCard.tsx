/** Scheda Account: chi sei, in quale casa, e come uscire. */

import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldWrapper } from '@/components/ui/field';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { useUpdatePreferences } from '@/hooks/usePreferences';

export function AccountCard() {
  const { user, logout } = useAuth();
  const { data: members } = useMembers();
  const preferenze = useUpdatePreferences();

  const iniziali = (user?.nome ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <Card id="account" className="scroll-mt-24" aria-labelledby="titolo-account">
      <CardHeader>
        <CardTitle id="titolo-account">
          <span aria-hidden="true">&#128273;</span> Account
        </CardTitle>
      </CardHeader>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-3.5">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full border-2
                       border-ink bg-primary font-display text-lg font-extrabold
                       text-primary-foreground shadow-sticker-sm"
            aria-hidden="true"
          >
            {iniziali}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-extrabold text-foreground">
              {user?.nome}
            </p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border-2 border-ink bg-muted/50 px-3.5 py-2.5">
            <dt className="font-display text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Casa
            </dt>
            <dd className="mt-1 truncate font-display font-bold text-foreground">
              {user?.household.nome}
            </dd>
          </div>
          <div className="rounded-[1.25rem] border-2 border-ink bg-muted/50 px-3.5 py-2.5">
            <dt className="font-display text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Valuta
            </dt>
            <dd className="mt-1 font-display font-bold text-foreground">
              {user?.household.valuta}
            </dd>
          </div>
        </dl>

        {/* Chi sono io nel registro di casa: serve a sapere di chi e' la carta. */}
        <FieldWrapper
          label="Nel registro di casa io sono"
          htmlFor="membro-collegato"
          hint="Serve a capire quali spese toccano la tua carta"
        >
          <div className="flex items-center gap-2.5">
            {members?.find((m) => m.id === user?.member_id) && (
              <MemberAvatar
                {...members.find((m) => m.id === user?.member_id)!}
                size="md"
              />
            )}
            <Select
              id="membro-collegato"
              value={user?.member_id ?? ''}
              disabled={preferenze.isPending}
              onChange={(e) =>
                preferenze.mutate({
                  member_id: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            >
              <option value="">&mdash; nessuno &mdash;</option>
              {members?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </div>
        </FieldWrapper>

        {/* Opt-in del riflesso casa -> personale. */}
        <div className="flex items-start justify-between gap-3 rounded-[1.25rem] border-2 border-ink bg-secondary/40 px-3.5 py-3">
          <label htmlFor="rifletti" className="cursor-pointer text-sm">
            <span className="font-display font-bold text-foreground">
              Rifletti le Spese casa nel mio budget &#128279;
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              Le spese che paghi tu, le entrate comuni che incassi e i conguagli
              compaiono da soli fra le tue voci personali, cos&igrave; il saldo carta
              &egrave; giusto senza reinserire niente. Spegnendolo, le voci gi&agrave;
              create vengono rimosse.
            </span>
          </label>
          <Switch
            id="rifletti"
            checked={user?.rifletti_spese_casa ?? true}
            disabled={preferenze.isPending || !user?.member_id}
            onCheckedChange={(valore) =>
              preferenze.mutate({ rifletti_spese_casa: valore })
            }
          />
        </div>

        {!user?.member_id && (
          <p className="rounded-[1.25rem] border-2 border-ink bg-warning-subtle px-3.5 py-2.5 text-xs font-semibold leading-relaxed">
            <span aria-hidden="true">&#9888;&#65039;</span> Scegli prima quale membro sei:
            senza quel legame non si pu&ograve; sapere quali spese sono uscite dalla tua
            carta.
          </p>
        )}

        <p className="rounded-[1.25rem] border-2 border-ink bg-secondary/40 px-3.5 py-2.5 text-xs font-semibold leading-relaxed">
          <span aria-hidden="true">&#128373;&#65039;</span> Il tuo{' '}
          <strong className="text-foreground">budget personale</strong> &egrave; visibile solo a
          te: chi condivide la casa vede le spese comuni, non le tue.
        </p>
      </div>

      <div className="flex justify-end border-t-2 border-dashed border-ink/25 bg-muted/40 px-5 py-3">
        <Button variant="destructive" onClick={logout}>
          <LogOut strokeWidth={2.5} />
          Esci
        </Button>
      </div>
    </Card>
  );
}
