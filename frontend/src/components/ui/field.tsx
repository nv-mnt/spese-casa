/** Campi di form con etichetta, suggerimento ed errore, per React Hook Form. */

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface FieldWrapperProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-destructive-foreground">*</span>}
        </Label>
        {hint && !error && <span className="text-2xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p
          className="ml-1 inline-flex items-center gap-1.5 rounded-full border-2 border-ink
                     bg-destructive px-2.5 py-0.5 text-2xs font-bold text-destructive-foreground"
          role="alert"
        >
          <span aria-hidden="true">&#9888;&#65039;</span>
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, id, ...rest },
  ref,
) {
  const generato = useId();
  const fieldId = id ?? rest.name ?? generato;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
      <Input ref={ref} id={fieldId} aria-invalid={Boolean(error)} {...rest} />
    </FieldWrapper>
  );
});

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, id, children, ...rest },
  ref,
) {
  const generato = useId();
  const fieldId = id ?? rest.name ?? generato;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
      <Select ref={ref} id={fieldId} aria-invalid={Boolean(error)} {...rest}>
        {children}
      </Select>
    </FieldWrapper>
  );
});

/** Input monetario con pastiglia € a destra. */
export const AmountField = forwardRef<HTMLInputElement, TextFieldProps>(function AmountField(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const generato = useId();
  const fieldId = id ?? rest.name ?? generato;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
      <div className="relative">
        <Input
          ref={ref}
          id={fieldId}
          inputMode="decimal"
          aria-invalid={Boolean(error)}
          className={`tabular pr-12 text-right ${className ?? ''}`}
          {...rest}
        />
        <span
          className="pointer-events-none absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2
                     items-center justify-center rounded-full border-2 border-ink bg-secondary
                     font-display text-sm font-extrabold text-secondary-foreground"
          aria-hidden="true"
        >
          &euro;
        </span>
      </div>
    </FieldWrapper>
  );
});
