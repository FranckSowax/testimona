import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Montserrat, PT_Sans, Caveat_Brush } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

const localesList = routing.locales as readonly string[];
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ToastProvider } from '@/components/Toast';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const ptSans = PT_Sans({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pt-sans',
});

const montserrat = Montserrat({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

const caveatBrush = Caveat_Brush({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-caveat',
});

export const metadata: Metadata = {
  title: {
    default: 'Testimona',
    template: '%s | Testimona',
  },
  description: 'Plateforme de pages mémorielles : témoignages, biographies, photos et donations.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Testimona',
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!localesList.includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${ptSans.variable} ${montserrat.variable} ${caveatBrush.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-background text-foreground flex min-h-[100dvh] flex-col font-sans antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ToastProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
            >
              Aller au contenu
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
            {modal}
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
