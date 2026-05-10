import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';

export async function SiteFooter() {
  const [t, user] = await Promise.all([getTranslations('footer'), getCurrentUser()]);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-white text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="tabular">
            {t('copyright')} ©{year}
          </span>
          <Link
            href="/about"
            className="transition-colors hover:text-foreground"
          >
            {t('contactUs')}
          </Link>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          {!user && (
            <Link
              href="/login"
              className="font-semibold text-accent transition-opacity hover:opacity-80"
            >
              {t('signIn')}
            </Link>
          )}
          <Link href="/about" className="transition-colors hover:text-foreground">
            {t('about')}
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            {t('faq')}
          </Link>
          <Link
            href="/legal/terms"
            className="transition-colors hover:text-foreground"
          >
            {t('terms')}
          </Link>
          <Link
            href="/legal/privacy"
            className="transition-colors hover:text-foreground"
          >
            {t('privacy')}
          </Link>
          <Link
            href="/legal/mentions"
            className="transition-colors hover:text-foreground"
          >
            {t('cookies')}
          </Link>
        </nav>

      </div>
    </footer>
  );
}
