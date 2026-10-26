import { setRequestLocale } from 'next-intl/server';

export const metadata = { title: 'Confidentialité' };

export default async function LegalPrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">
        {locale === 'en' ? 'Privacy policy' : 'Politique de confidentialité'}
      </h1>
      <p className="text-muted-foreground mt-4">
        {locale === 'en'
          ? 'This page will host the privacy policy. Contact: hello@testimona.com'
          : 'Cette page accueillera la politique de confidentialité. Contact : hello@testimona.com'}
      </p>
    </article>
  );
}
