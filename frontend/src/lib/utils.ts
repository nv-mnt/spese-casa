import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Unisce classi Tailwind risolvendo i conflitti (convenzione shadcn/21st). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
