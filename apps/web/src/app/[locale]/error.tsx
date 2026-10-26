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
      <h1 className="font-display text-foreground text-2xl font-semibold">
        Une erreur est survenue
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Nous n&apos;avons pas pu afficher cette page. Tu peux réessayer ou revenir à l&apos;accueil.
      </p>
      {error.digest && (
        <p className="text-muted-foreground mt-2 text-xs italic">Code : {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Réessayer
        </button>
        {/* WHY: rechargement complet pour repartir d'un état sain après une erreur. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="border-border text-foreground hover:bg-surface rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
