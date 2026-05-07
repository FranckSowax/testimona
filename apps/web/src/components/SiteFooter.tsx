import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';

const SOCIAL_LINKS: { key: string; href: string; label: string; svg: string }[] = [
  {
    key: 'facebook',
    href: 'https://www.facebook.com/testimona',
    label: 'Facebook',
    svg: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z',
  },
  {
    key: 'instagram',
    href: 'https://www.instagram.com/testimona',
    label: 'Instagram',
    svg: 'M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.42.46.66.26 1.22.6 1.77 1.16.55.55.9 1.11 1.16 1.77.24.63.41 1.36.46 2.42.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.46 2.42a4.9 4.9 0 0 1-1.16 1.77 4.9 4.9 0 0 1-1.77 1.16c-.63.24-1.36.41-2.42.46-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.42-.46a4.9 4.9 0 0 1-1.77-1.16 4.9 4.9 0 0 1-1.16-1.77c-.24-.63-.41-1.36-.46-2.42C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.46-2.42.26-.66.6-1.22 1.16-1.77.55-.55 1.11-.9 1.77-1.16.63-.24 1.36-.41 2.42-.46C8.94 2.01 9.28 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.4-8.4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z',
  },
  {
    key: 'twitter',
    href: 'https://twitter.com/testimona',
    label: 'X (Twitter)',
    svg: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z',
  },
  {
    key: 'linkedin',
    href: 'https://www.linkedin.com/company/testimona',
    label: 'LinkedIn',
    svg: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18.34V10.5H5.67v7.84h2.67Zm-1.34-9c.86 0 1.55-.7 1.55-1.55a1.55 1.55 0 1 0-3.1 0c0 .85.69 1.55 1.55 1.55Zm11.34 9v-4.6c0-2.4-1.28-3.52-3-3.52-1.4 0-2.04.77-2.39 1.32V10.5h-2.67c.04.78 0 7.84 0 7.84h2.67v-4.38c0-.24.02-.48.09-.65.18-.48.62-.97 1.35-.97.95 0 1.33.72 1.33 1.78v4.22h2.62Z',
  },
  {
    key: 'whatsapp',
    href: 'https://wa.me/0',
    label: 'WhatsApp',
    svg: 'M19.05 4.91A10 10 0 0 0 12.04 2C6.5 2 2 6.5 2 12.04c0 1.77.46 3.49 1.34 5.01L2 22l5.07-1.33a10.02 10.02 0 0 0 4.97 1.27h.01c5.54 0 10.04-4.5 10.04-10.04 0-2.68-1.04-5.2-2.94-7.09l-.1.1ZM12.05 20.13a8.06 8.06 0 0 1-4.11-1.13l-.3-.18-3.01.79.8-2.93-.19-.3a8.06 8.06 0 0 1-1.24-4.34c0-4.46 3.63-8.09 8.1-8.09a8.04 8.04 0 0 1 5.72 2.37 8.04 8.04 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09Zm4.43-6.07c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.55.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.21-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.31-.75-1.79-.2-.47-.4-.41-.55-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 1.99 0 1.18.86 2.31.98 2.47.12.16 1.69 2.59 4.1 3.63.57.25 1.02.4 1.37.51.58.18 1.1.16 1.52.1.46-.07 1.43-.59 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28Z',
  },
];

export async function SiteFooter() {
  const t = await getTranslations('footer');
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label="Accueil Testimona" className="inline-flex items-center">
            <Image
              src="/images/logo-testimona.svg"
              alt="Testimona"
              width={150}
              height={48}
              className="h-12 w-auto"
            />
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('tagline')}
          </p>
          <div className="mt-5">
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-foreground/70">
              {t('followUs')}
            </p>
            <ul className="mt-3 flex gap-2">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-foreground/70 transition hover:border-primary hover:text-primary"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d={s.svg} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-foreground/70">
            Testimona
          </p>
          <nav aria-label="Liens secondaires" className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/about" className="text-muted-foreground hover:text-foreground">
              À propos
            </Link>
            <Link href="/legal/mentions" className="text-muted-foreground hover:text-foreground">
              {t('legal')}
            </Link>
            <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">
              {t('privacy')}
            </Link>
            <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">
              {t('terms')}
            </Link>
          </nav>
        </div>

        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-foreground/70">
            {t('language')}
          </p>
          <div className="mt-3">
            <LocaleSwitcher />
          </div>
        </div>
      </div>
      <div className="border-t border-border bg-white">
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t('copyright')}
        </p>
      </div>
    </footer>
  );
}
