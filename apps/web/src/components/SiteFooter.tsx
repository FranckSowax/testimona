import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Testimona</p>
        <nav aria-label="Liens du pied de page" className="flex gap-4">
          <Link href="/legal/mentions" className="hover:text-foreground">
            Mentions légales
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            Confidentialité
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            CGU
          </Link>
        </nav>
      </div>
    </footer>
  );
}
