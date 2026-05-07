import { setRequestLocale } from 'next-intl/server';

export const metadata = { title: 'CGU' };

export default async function LegalTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">
        {locale === 'en' ? 'Terms of service' : "Conditions générales d'utilisation"}
      </h1>
      <p className="mt-4 text-muted-foreground">
        {locale === 'en'
          ? 'This page will host the terms of service. Contact: hello@testimona.com'
          : "Cette page accueillera les conditions générales d'utilisation. Contact : hello@testimona.com"}
      </p>
    </article>
  );
}
