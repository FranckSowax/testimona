import { setRequestLocale } from 'next-intl/server';

export const metadata = { title: 'Mentions légales' };

export default async function LegalMentionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">
        {locale === 'en' ? 'Legal notice' : 'Mentions légales'}
      </h1>
      <p className="text-muted-foreground mt-4">
        {locale === 'en'
          ? 'This page will host the legal notice. Contact: hello@testimona.com'
          : 'Cette page accueillera les mentions légales. Contact : hello@testimona.com'}
      </p>
    </article>
  );
}
