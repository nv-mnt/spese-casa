import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useAuth } from '@/context/AuthContext';

import { AuthShell } from './AuthShell';

const schema = z.object({
  email: z.string().trim().min(1, "Inserisci l'email").email('Email non valida'),
  password: z.string().min(1, 'Inserisci la password'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errore, setErrore] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const invia = handleSubmit(async (values) => {
    setErrore(null);
    try {
      await login(values);
      const destinazione = (location.state as { from?: string } | null)?.from ?? '/mesi';
      navigate(destinazione, { replace: true });
    } catch (error) {
      setErrore(getErrorMessage(error, 'Accesso non riuscito'));
    }
  });

  return (
    <AuthShell title="Bentornato!" subtitle="Entra e guarda a che punto siamo con i conti.">
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

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@esempio.it"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Accedi
          {!isSubmitting && <ArrowRight />}
        </Button>
      </form>

      <p className="mt-6 border-t-2 border-dashed border-ink/25 pt-5 text-center text-sm font-semibold text-muted-foreground">
        Non hai un account?{' '}
        <Link
          to="/registrazione"
          className="font-display font-extrabold underline decoration-wavy decoration-2 underline-offset-4"
        >
          Registrati!
        </Link>
      </p>
    </AuthShell>
  );
}
