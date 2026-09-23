import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';

import { AuthShell } from './AuthShell';

const schema = z
  .object({
    nome: z.string().trim().min(1, 'Inserisci il tuo nome').max(120),
    email: z.string().trim().min(1, "Inserisci l'email").email('Email non valida'),
    household_nome: z.string().trim().max(120).optional(),
    password: z.string().min(8, 'Almeno 8 caratteri'),
    conferma: z.string().min(1, 'Conferma la password'),
  })
  .refine((v) => v.password === v.conferma, {
    message: 'Le password non coincidono',
    path: ['conferma'],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registra } = useAuth();
  const navigate = useNavigate();
  const [errore, setErrore] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const invia = handleSubmit(async (values) => {
    setErrore(null);
    try {
      await registra({
        nome: values.nome.trim(),
        email: values.email.trim(),
        password: values.password,
        ...(values.household_nome?.trim()
          ? { household_nome: values.household_nome.trim() }
          : {}),
      });
      navigate('/mesi', { replace: true });
    } catch (error) {
      setErrore(getErrorMessage(error, 'Registrazione non riuscita'));
    }
  });

  return (
    <AuthShell
      title="Facciamo squadra!"
      subtitle="Creiamo il tuo account e i due membri della casa."
    >
      <form onSubmit={invia} className="space-y-4" noValidate>
        {errore && (
          <div
            className="flex items-start gap-2.5 rounded-[1.25rem] border-2 border-ink bg-destructive
                       px-3.5 py-2.5 text-sm font-bold text-destructive-foreground shadow-sticker-sm"
            role="alert"
          >
            <span className="text-base leading-none" aria-hidden="true">
              &#128557;
            </span>
            <span>{errore}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nome"
            autoComplete="name"
            error={errors.nome?.message}
            {...register('nome')}
          />
          <TextField
            label="Nome della casa"
            hint="Facoltativo"
            placeholder="Casa Giuseppe &amp; Angela"
            error={errors.household_nome?.message}
            {...register('household_nome')}
          />
        </div>

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@esempio.it"
          error={errors.email?.message}
          {...register('email')}
        />

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="Min. 8 caratteri"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <TextField
            label="Conferma password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.conferma?.message}
            {...register('conferma')}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Crea account
          {!isSubmitting && <ArrowRight />}
        </Button>
      </form>

      <p className="mt-6 border-t-2 border-dashed border-ink/25 pt-5 text-center text-sm font-semibold text-muted-foreground">
        Hai gi&agrave; un account?{' '}
        <Link
          to="/login"
          className="font-display font-extrabold underline decoration-wavy decoration-2 underline-offset-4"
        >
          Accedi!
        </Link>
      </p>
    </AuthShell>
  );
}
