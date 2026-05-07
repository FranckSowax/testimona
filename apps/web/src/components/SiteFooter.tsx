import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {t('copyright')}
        </p>
        <nav aria-label="Liens du pied de page" className="flex flex-wrap items-center gap-4">
          <Link href="/legal/mentions" className="hover:text-foreground">
            {t('legal')}
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            {t('privacy')}
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            {t('terms')}
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </footer>
  );
}
