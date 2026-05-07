import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/server';

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Testimona
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-4 text-sm">
          <Link href="/search" className="text-muted-foreground hover:text-foreground">
            Rechercher
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Tableau de bord
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
