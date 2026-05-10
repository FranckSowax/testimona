'use client';

import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== 'undefined') {
      console.error('LocaleError', error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Une erreur est survenue
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nous n&apos;avons pas pu afficher cette page. Tu peux réessayer ou revenir à l&apos;accueil.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs italic text-muted-foreground">Code : {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
