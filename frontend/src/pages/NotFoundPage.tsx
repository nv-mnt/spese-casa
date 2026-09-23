import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span
        className="flex size-24 animate-float items-center justify-center rounded-full border-3
                   border-ink bg-accent text-5xl shadow-sticker-lg"
        aria-hidden="true"
      >
        &#128373;&#65039;
      </span>
      <p className="mt-6 font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground">
        Qui non c&apos;&egrave; niente!
      </h1>
      <p className="mt-2 max-w-sm text-sm font-semibold text-muted-foreground">
        La pagina che cerchi si &egrave; nascosta bene, oppure non esiste proprio.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/mesi">
          <ArrowLeft strokeWidth={2.5} />
          Torna a casa
        </Link>
      </Button>
    </div>
  );
}
