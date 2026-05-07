import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/server';

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" aria-label="Accueil Testimona" className="flex items-center">
          <Image
            src="/images/logo-testimona.svg"
            alt="Testimona"
            width={180}
            height={64}
            priority
            className="h-14 w-auto"
          />
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-3 text-sm">
          <Link
            href="/search"
            className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground"
          >
            Rechercher
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground"
              >
                Mes mémoriels
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md border-2 border-foreground/80 px-3 py-1.5 font-medium text-foreground opacity-80 transition-opacity hover:opacity-100"
                >
                  Se déconnecter
                </button>
              </form>
              <Image
                src="/images/avatar-connected.svg"
                alt=""
                width={36}
                height={36}
                className="ml-1 h-9 w-9"
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border-2 border-foreground/80 px-3 py-1.5 font-medium text-foreground opacity-80 transition-opacity hover:opacity-100"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
              >
                Créer un compte
              </Link>
              <Image
                src="/images/avatar.svg"
                alt=""
                width={36}
                height={36}
                className="ml-1 h-9 w-9"
              />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
