import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Testimona</h1>
      <p className="mt-4 text-muted-foreground">
        Plateforme de pages mémorielles. Cette page est rendue côté serveur (RSC).
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/search"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Rechercher un mémorial
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-border px-4 py-2 hover:bg-muted"
        >
          Se connecter
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-border px-4 py-2 hover:bg-muted"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
